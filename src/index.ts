import { fabric } from 'fabric';
import { Bezier } from 'bezier-js';
import isEqual from 'lodash-es/isEqual';
import cloneDeep from 'lodash-es/cloneDeep';
import defaults from 'lodash-es/defaults';
import round from 'lodash-es/round';
import {
  CREATE_DEFAULT_LINE,
  CREATE_DEFAULT_POINTER,
  CREATE_DEFAULT_TRIGGER,
} from './default-create';

/** 用于标记路径编辑器元素，便于后续快速查找和辨别元素 */
const PATH_SYMBOL = Symbol('fabric-path-editor-symbol');

/** 用于记录对象在编辑器中记录的信息 */
const PATH_RECORD_INFO = Symbol('fabric-path-editor-record-info');

interface EditorOptions {}

/**
 * 控制类型
 */
enum EditorObjectType {
  BACKGROUND = 'background',
  MAJOR_POINT = 'major-point',
  SUB_POINT = 'sub-point',
}

/**
 * 指令类型
 */
enum InstructionType {
  START = 'M',
  LINE = 'L',
  QUADRATIC_CURCE = 'Q',
  BEZIER_CURVE = 'C',
  CLOSE = 'z',
}

/**
 * 曲线类型
 */
const CurceInstructionTypes = [
  InstructionType.QUADRATIC_CURCE,
  InstructionType.BEZIER_CURVE,
];

/** 指令类型 */
type Instruction = [type: InstructionType, ...croods: number[]];

type AroundPoint = {
  instruction: Instruction;
  instructionValueIdx: number;
  point: Crood;
  pointType: EditorObjectType;
};

/**
 * @EditorObjectType 对象类型
 */
interface EditorControlPoint extends fabric.Group {
  [PATH_SYMBOL]: true;
  [PATH_RECORD_INFO]: {
    type: EditorObjectType.MAJOR_POINT | EditorObjectType.SUB_POINT;
    instruction?: Instruction;
    instructionValueIdx?: number;
  };
}

/**
 * 控制柄
 */
interface EditorControlHandler {
  point: EditorControlPoint;
  line: fabric.Line;
  belong?: EditorControlPoint;
  belongPosition?: 'pre' | 'next';
  hidden?: boolean;
  mirror?: EditorControlHandler;
}

/**
 * fabric路径编辑
 *
 * @example
 *
 * const editor = new FabricPathEditor();
 *
 * editor.observe(new fabric.Path('M 0 0 L 1 1 Z'));
 *
 * editor.enterEditing();
 *
 * editor.leaveEditing();
 *
 * editor.destroy();
 */
class FabricPathEditor {
  /**
   * 编辑器交互所在画布
   */
  private _platform: fabric.Canvas;

  /**
   * 编辑器配置
   */
  private _options = {};

  /**
   * 来源路径对象
   */
  source: fabric.Path | null = null;

  /**
   * 来源路径克隆对象（实际编辑对象）
   */
  target: fabric.Path | null = null;

  /**
   * 控制器集合
   */
  controllers: {
    points: EditorControlPoint[];
    handlers: EditorControlHandler[];
    activePoints: EditorControlPoint[];
    activePoint?: EditorControlPoint;
    activeHandlerPoint?: EditorControlPoint;
  } = { points: [], handlers: [], activePoints: [] };

  /**
   * 监听事件
   */
  listeners: {
    type: 'global' | 'canvas';
    eventName: string;
    handler: (e: any) => void;
  }[] = [];

  /**
   * 历史记录
   */
  records: {
    undo: { path: string; left: number; top: number }[];
    redo: { path: string; left: number; top: number }[];
  } = {
    undo: [],
    redo: [],
  }

  /**
   * 内置状态
   */
  private _inbuiltStatus = {
    /**
     * 是否取消选中事件
     */
    cancelSelectEvent: false,
    /**
     * 执行附带操作，如控制点镜像，关键点携带控制点移动
     * @default true
     */
    extraActions: true,
    /**
     * 是否路径端点接触合并
     * @default false
     */
    autoPathMerge: false,
    /**
     * 是否处于等待关键点添加的状态
     * @default false
     */
    awaitAdd: false,
  };

  /**
   * 存储画布原始状态
   */
  private _storePlatformStatus: {
    canvasSelection: boolean;
    objectSelections: WeakMap<fabric.Object, Boolean>;
  } | null = null;

  /**
   * 构造函数，需指定编辑器交互的目标画布
   * @param platform 绘制的
   */
  constructor(platform: fabric.Canvas, options: EditorOptions = {}) {
    this._platform = platform;

    this._options = defaults(options, this._options);
  }

  /**
   * 观察路径
   * @param path fabric路径对象（fabric.Path）
   */
  observe(path: fabric.Path) {
    this.source = path;
  }

  /**
   * 路径变换
   * @param path 路径
   * @param options 变换配置
   * @param inPlace 原地变换路径
   */
  static transformPath(
    path: fabric.Path,
    transform: {
      translate?: { x: number; y: number };
      scale?: { x: number; y: number };
      rotate?: number;
    },
    inPlace = true
  ) {
    const { translate, scale, rotate } = transform;

    const _path = inPlace ? path.path : cloneDeep(path.path);
    _path?.forEach((item, pathIdx) => {
      const [, ...croods] = item as unknown as [
        type: string,
        ...croods: number[]
      ];
      for (let i = 0; i < croods.length; i += 2) {
        let x = _path[pathIdx][i + 1];
        let y = _path[pathIdx][i + 2];

        if (scale !== undefined) {
          x *= scale.x;
          y *= scale.y;
        }

        if (rotate !== undefined) {
          x =
            Math.cos((rotate * Math.PI) / 180) * x -
            Math.sin((rotate * Math.PI) / 180) * y;
          y =
            Math.sin((rotate * Math.PI) / 180) * x +
            Math.cos((rotate * Math.PI) / 180) * y;
        }

        if (translate !== undefined) {
          x += translate.x;
          y += translate.y;
        }

        _path[pathIdx][i + 1] = x;
        _path[pathIdx][i + 2] = y;
      }
    });
    return _path;
  }

  /**
   * 使用新的路径信息初始化路径对象
   * @param path 路径对象
   * @param d 新的路径信息
   * @param matrix 变换配置
   */
  static initializePath(
    path: fabric.Path,
    d: string,
    matrix = [1, 0, 0, 1, 0, 0]
  ) {
    const oldCroods = { left: path.left!, top: path.top! };

    // 精确小数点到后3位
    path.path?.forEach((item) => {
      const [, ...croods] = item as unknown as [
        type: string,
        ...croods: number[]
      ];
      for (let i = 0; i < croods.length; i += 2) {
        item[i + 1] = round(item[i + 1], 3);
        item[i + 2] = round(item[i + 2], 3);
      }
    });

    // 记录旧的路径中心点
    const oldPath = new fabric.Path((fabric.util as any).joinPath(path.path));
    const oldPathCenter = oldPath.getCenterPoint();

    // 使用新的路径重新构建路径对象
    path.initialize(d as any);

    // 记录新的路径中心的
    const newPath = new fabric.Path(d);
    const newPathCenter = newPath.getCenterPoint();

    // 计算路径偏移差值
    const distance = fabric.util.transformPoint(
      new fabric.Point(
        newPathCenter.x - oldPathCenter.x,
        newPathCenter.y - oldPathCenter.y
      ),
      matrix
    );

    path.set({
      left: oldCroods.left! + distance.x,
      top: oldCroods.top! + distance.y,
    });

    path.setCoords();
  }

  /**
   * 将二阶曲线转换为三阶贝塞尔曲线
   */
  static convertQuadraticToCubic(p0: Crood, instruction: Instruction) {
    // 解析输入字符串
    const points = Array.from({ length: 2 }).map((_, i) => ({
      x: instruction[i * 2 + 1],
      y: instruction[i * 2 + 2],
    })) as Crood[];

    // 二阶贝塞尔曲线的点
    const [p1, p2] = points;

    // 计算三阶贝塞尔曲线的控制点
    const q1 = {
      x: (2 / 3) * p1.x + (1 / 3) * p0.x,
      y: (2 / 3) * p1.y + (1 / 3) * p0.y,
    };
    const q2 = {
      x: (2 / 3) * p1.x + (1 / 3) * p2.x,
      y: (2 / 3) * p1.y + (1 / 3) * p2.y,
    };
    const q3 = p2;

    // 创建三阶贝塞尔曲线指令
    return ['C', q1.x, q1.y, q2.x, q2.y, q3.x, q3.y] as Instruction;
  }

  /**
   * 画布真实坐标转变换后坐标
   */
  private _toRelativeCrood(x: number, y: number) {
    const [zoom, , , , offsetX, offsetY] = this._platform.viewportTransform!;
    return {
      x: (x - offsetX) / zoom,
      y: (y - offsetY) / zoom,
    };
  }

  /**
   * 路径修补
   *
   * @note 做一些必要的路径修补操作，让后续的操作更方便
   */
  private _patchPath(path: fabric.Path) {
    if (!path.path) return;

    // ① 清除路径自带偏移，如果不消除，后续的所有关键点、控制点的编辑都要额外处理路径自身的偏移
    FabricPathEditor.transformPath(path, {
      translate: {
        x: -path.pathOffset.x,
        y: -path.pathOffset.y,
      },
    });

    // ② 闭合的路径如果在闭合指令前没有回到起始点，补充一条回到起始点的指令
    const itemPaths = this._splitPath(path.path as unknown as Instruction[]);
    for (const itemPath of itemPaths) {
      // 修正头指令，头指令必须是M开始指令，其他的也没效果
      if (itemPath[0][0] !== InstructionType.START) {
        itemPath[0] = [
          InstructionType.START,
          ...itemPath[0].slice(itemPath[0].length - 2),
        ] as Instruction;
      }

      const isAutoClose =
        itemPath[itemPath.length - 1][0] === InstructionType.CLOSE;
      if (isAutoClose) {
        const startPoint = itemPath[0].slice(itemPath[0].length - 2);
        const endPoint = itemPath[itemPath.length - 2].slice(
          itemPath[itemPath.length - 2].length - 2
        );
        if (
          // 如果路径只有一个起始点且闭合[M,Z]
          itemPath[0] === itemPath[itemPath.length - 2] ||
          // 或者路径闭合但是最后一个关键点不完全等于起始点
          endPoint[0] !== startPoint[0] ||
          endPoint[1] !== startPoint[1]
        ) {
          itemPath.splice(itemPath.length - 1, 0, [
            InstructionType.LINE,
            startPoint[0],
            startPoint[1],
          ] as Instruction);
        }
      }
    }

    const _itemPaths = itemPaths.map((path) => this._invertPath(path));

    path.path = _itemPaths.flat(1) as unknown as fabric.Point[];
    path.pathOffset = new fabric.Point(0, 0);
  }

  /**
   * 初始背景（将作为部分事件的触发对象）
   */
  private _initBackground() {
    if (!this._platform) return;
    // 创建格子背景
    const patternSourceCanvas = new fabric.StaticCanvas(null, {
      width: 20,
      height: 20,
    });
    patternSourceCanvas.add(
      new fabric.Rect({
        width: 20,
        height: 20,
        fill: 'transparent',
        stroke: '#f1f1f1',
        strokeWidth: 0.5,
        strokeDashArray: [4, 2],
      })
    );
    patternSourceCanvas.renderAll();
    const bg = new fabric.Rect({
      width: this._platform.getWidth(),
      height: this._platform.getHeight(),
      fill: new fabric.Pattern({
        source: patternSourceCanvas.getElement(),
        repeat: 'repeat',
      }),
      objectCaching: false,
      selectable: false,
    });

    bg[PATH_SYMBOL] = true;
    bg[PATH_RECORD_INFO] = {
      type: EditorObjectType.BACKGROUND,
    };

    this._platform.add(bg);
  }

  /**
   * 初始编辑环境，冻结画布框选操作及其他已存在元素
   */
  private _initPlatformStatus() {
    if (!this._platform) return;

    const canvas = this._platform;

    // 先缓存状态，结束编辑后还原状态
    this._storePlatformStatus = {
      canvasSelection: canvas.selection ?? false,
      objectSelections: new WeakMap(
        canvas._objects.map((object) => [object, object.selectable ?? true])
      ),
    };

    // 画布禁止框选
    canvas.selection = true;
    (canvas.preserveObjectStacking = true),
      (canvas.controlsAboveOverlay = true),
      // 画布取消元素选中
      canvas.discardActiveObject();
    // 将当前画布所有元素变为不可操作，且透明度调整为「backgroundOpacity」，仅充当背景
    canvas.forEachObject((object) => {
      object.set({ selectable: false });
    });
  }

  /**
   * 拆分路径段
   */
  private _splitPath(path: Instruction[]) {
    const splitPaths = path.reduce(
      (paths, instruction, idx, arr) => {
        if (!instruction) return paths;
        if (
          instruction[0] === InstructionType.START &&
          paths[paths.length - 1].length
        )
          paths.push([]);
        paths[paths.length - 1].push(instruction);
        if (instruction[0] === InstructionType.CLOSE && idx !== arr.length - 1)
          paths.push([]);
        return paths;
      },
      [[]] as (typeof path)[]
    );
    return splitPaths;
  }

  /**
   * 获取周围指令信息（cur当前指令、pre上一个指令、next下一个指令）
   */
  private _getAroundInstructions(instruction: Instruction) {
    const path = this.target!.path!;

    // 提取路径段
    const itemPaths = this._splitPath(path as unknown as Instruction[]);
    const _path = itemPaths.find((path) => path.includes(instruction))!;

    // 获取前后指令
    const instructionIdx = _path.indexOf(instruction);

    // 前一个指令
    let preInstruction = _path[instructionIdx - 1];
    // 后一个指令
    let nextInstruction = _path[instructionIdx + 1];

    // 如果没有上一个指令，则判断是否是闭合路径，如果是闭合路径则倒数第二个指令视为上一个指令
    const isClosePath = _path[_path.length - 1]?.[0] === InstructionType.CLOSE;
    if (isClosePath && !preInstruction) {
      preInstruction = _path[_path.length - 2];
    }

    // 如果有下一个指令且下一个指令是闭合指令，则指向起始指令
    if (nextInstruction && nextInstruction[0] === InstructionType.CLOSE) {
      nextInstruction = _path[0];
    }

    return {
      path: _path,
      paths: itemPaths,
      cur: instruction,
      pre: preInstruction ?? null,
      next: nextInstruction ?? null,
    } as {
      path: Instruction[];
      paths: Instruction[][];
      cur: Instruction;
      pre: Instruction | null;
      next: Instruction | null;
    };
  }

  /**
   * 获取指令关键点
   */
  private _getInstructionMajorPoint(instruction: Instruction | null) {
    return this.controllers.points.find(
      (i) => i[PATH_RECORD_INFO].instruction === instruction
    );
  }

  /**
   * 通过关键点获取前后点位的信息
   */
  private _getAroundPoints(point: EditorControlPoint) {
    // 因为获取指令信息时会跳过闭合指令，所以这里都不需要考虑闭合指令
    const { path, cur, pre, next } = this._getAroundInstructions(
      point[PATH_RECORD_INFO].instruction!
    );

    const curPoint: AroundPoint = {
      instruction: cur,
      instructionValueIdx: cur.length - 2,
      point: {
        x: cur[cur.length - 2] as number,
        y: cur[cur.length - 1] as number,
      },
      pointType: EditorObjectType.MAJOR_POINT,
    };
    let prePoint: AroundPoint | undefined;
    let nextPoint: AroundPoint | undefined;

    switch (cur[0]) {
      case InstructionType.START: {
        if (pre) {
          // 如果是曲线由于已经通过补丁处理，所以上一个点一定是控制点
          if (CurceInstructionTypes.includes(pre[0])) {
            prePoint = {
              instruction: pre,
              instructionValueIdx: pre.length - 4,
              point: {
                x: pre[pre.length - 4] as number,
                y: pre[pre.length - 3] as number,
              },
              pointType: EditorObjectType.SUB_POINT,
            };
          } else {
            const prePre = path[2 % (path.length - 1)];
            prePoint = {
              instruction: prePre,
              instructionValueIdx: prePre.length - 2,
              point: {
                x: prePre[prePre.length - 2] as number,
                y: prePre[prePre.length - 1] as number,
              },
              pointType: EditorObjectType.MAJOR_POINT,
            };
          }
        }
        break;
      }
      case InstructionType.LINE:
        if (pre)
          prePoint = {
            instruction: pre,
            instructionValueIdx: pre.length - 2,
            point: {
              x: pre[pre.length - 2] as number,
              y: pre[pre.length - 1] as number,
            },
            pointType: EditorObjectType.MAJOR_POINT,
          };
        break;
      case InstructionType.QUADRATIC_CURCE:
        prePoint = {
          instruction: cur,
          instructionValueIdx: 1,
          point: { x: cur[1] as number, y: cur[2] as number },
          pointType: EditorObjectType.SUB_POINT,
        };
        break;
      case InstructionType.BEZIER_CURVE:
        prePoint = {
          instruction: cur,
          instructionValueIdx: 3,
          point: { x: cur[3] as number, y: cur[4] as number },
          pointType: EditorObjectType.SUB_POINT,
        };
        break;
      default:
        break;
    }

    if (next) {
      nextPoint = {
        instruction: next,
        instructionValueIdx: 1,
        point: { x: next[1] as number, y: next[2] as number },
        pointType: CurceInstructionTypes.includes(next[0])
          ? EditorObjectType.SUB_POINT
          : EditorObjectType.MAJOR_POINT,
      };
    }

    return {
      cur: curPoint,
      pre: prePoint,
      next: nextPoint,
    };
  }

  /**
   * 更新路径指令
   * @note 不更新画布，需要重新渲染画布才可看到正确效果
   */
  private _updatePathInstruction(
    preInstruction: Instruction,
    newInstruction: Instruction
  ) {
    // const instructions = (this.target?.path ?? []) as unknown as Instruction[];

    // const index = instructions.indexOf(preInstruction);
    // if (index === -1) return;

    // instructions.splice(index, 1, newInstruction as Instruction);

    // 为了不丢失引用，只能将值逐个赋值到旧的指令中
    preInstruction.splice(0, preInstruction.length, ...newInstruction);
  }

  /**
   * 将相对坐标点转化为带元素本身变换的偏移位置
   */
  private _calcAbsolutePosition(crood: Crood): Position {
    const _point = fabric.util.transformPoint(
      new fabric.Point(crood.x, crood.y),
      this.source!.calcOwnMatrix()
    );

    return { left: _point.x, top: _point.y };
  }

  /**
   * 移除元素本身变换，将实际偏移转化为路径相对坐标
   */
  private _calcRelativeCrood(position: Position): Crood {
    const _point = fabric.util.transformPoint(
      new fabric.Point(position.left, position.top),
      fabric.util.invertTransform(this.source!.calcOwnMatrix())
    );

    return _point;
  }

  /**
   * 初始路径关键点
   */
  private _initPathControlPoints(skipUpdateEvent = false) {
    const canvas = this._platform;
    const pathObj = this.target;
    if (!canvas || !pathObj) return;

    const { points: oldPoints, activePoints } = this.controllers;

    this._inbuiltStatus.cancelSelectEvent = true;

    // 移除旧的关键点
    canvas.discardActiveObject();
    canvas.remove(...oldPoints);

    // 记录新的操作点和控制
    const points: EditorControlPoint[] = [];

    // 创建路径关键点的操作点（即实际路径上的节点，而非曲线上的虚拟点）
    this._splitPath(pathObj.path as unknown as Instruction[])?.forEach(
      (path) => {
        path.forEach((item, index) => {
          const instruction = item;

          // 闭合点不添加关键点
          if (instruction[0] === InstructionType.CLOSE) return;

          // 如果下一个指令是闭合点，则不添加关键点
          // 因为路径补丁的时候遇到闭合点会添加一条到起始点的路径，所以当前关键点正好和起始点一致
          if (path[index + 1]?.[0] === InstructionType.CLOSE) return;

          // 关键点的路径位置
          const [x, y] = instruction.slice(instruction.length - 2) as number[];

          const reuse = oldPoints.length > 0;
          // 重用旧节点
          const point =
            oldPoints.pop() ??
            (new fabric.Group([CREATE_DEFAULT_POINTER()], {
              originX: 'center',
              originY: 'center',
              // 选中时不出现选中框
              hasBorders: false,
              hasControls: false,
            }) as EditorControlPoint);

          point[PATH_SYMBOL] = true;
          point[PATH_RECORD_INFO] = {
            type: EditorObjectType.MAJOR_POINT,
            instruction,
            instructionValueIdx: instruction.length - 2,
          };

          // 将目标对象的变换应用到操作点上
          point.set(this._calcAbsolutePosition({ x, y }));

          points.push(point);
        });
      }
    );

    // 添加进画布
    canvas.add(...points);
    this.controllers.points = points;
    this.controllers.activePoints = activePoints.filter(i => points.includes(i));

    this._inbuiltStatus.cancelSelectEvent = false;

    if (!skipUpdateEvent) this._fire('update');
  }

  /**
   * 创建路径变换控制对象
   */
  private _createPathControlHandler() {
    const point = new fabric.Group([CREATE_DEFAULT_TRIGGER()], {
      originX: 'center',
      originY: 'center',
      hasBorders: false,
      hasControls: false,
    }) as EditorControlPoint;

    point[PATH_SYMBOL] = true;
    point[PATH_RECORD_INFO] = {
      type: EditorObjectType.SUB_POINT,
    };

    const line = CREATE_DEFAULT_LINE();

    return { point, line } as EditorControlHandler;
  }

  /**
   * 反转路径
   */
  private _invertPath(path: Instruction[]) {
    const _path: Instruction[] = [];

    let isClosePath = false;

    for (let i = path.length - 1; i >= 0; i--) {
      const instruction = path[i];

      const preInstruction = path[i - 1];
      const preMajorPointCrood = preInstruction?.slice(
        preInstruction.length - 2
      ) as number[];

      if (i === path.length - 1) {
        if (instruction[0] === InstructionType.CLOSE) {
          _path.push([
            InstructionType.START,
            ...preMajorPointCrood,
          ] as Instruction);
        } else {
          _path.push([
            InstructionType.START,
            ...instruction.slice(instruction.length - 2),
          ] as Instruction);
        }
      }

      switch (instruction[0]) {
        case InstructionType.START:
          if (isClosePath) _path.push([InstructionType.CLOSE]);
          break;
        case InstructionType.LINE:
          _path.push([InstructionType.LINE, ...preMajorPointCrood]);
          break;
        case InstructionType.QUADRATIC_CURCE:
          _path.push([
            InstructionType.QUADRATIC_CURCE,
            instruction[1],
            instruction[2],
            ...preMajorPointCrood,
          ]);
          break;
        case InstructionType.BEZIER_CURVE:
          _path.push([
            InstructionType.BEZIER_CURVE,
            instruction[3],
            instruction[4],
            instruction[1],
            instruction[2],
            ...preMajorPointCrood,
          ]);
          break;
        case InstructionType.CLOSE:
          isClosePath = true;
          break;
        default:
          break;
      }
    }

    return _path;
  }

  /**
   * 合并路径
   */
  private _mergePath(
    sourcePoint: EditorControlPoint,
    targetPoint: EditorControlPoint
  ) {
    const path = this.target!.path!;

    // 获取全路径段
    const itemPaths = this._splitPath(path as unknown as Instruction[]);

    // 提取原路径和目标路径
    const sourceInfo = sourcePoint[PATH_RECORD_INFO];
    const targetInfo = targetPoint[PATH_RECORD_INFO];

    let sourcePath: Instruction[] | undefined;
    let targetPath: Instruction[] | undefined;
    let mergePath: Instruction[] | undefined;

    for (let i = 0; i < itemPaths.length; ) {
      const itemPath = itemPaths[i];
      if (sourcePath && targetPath) break;
      if (itemPath.includes(sourceInfo.instruction!)) sourcePath = itemPath;
      if (itemPath.includes(targetInfo.instruction!)) targetPath = itemPath;
      if (itemPath === sourcePath || itemPath === targetPath) {
        itemPaths.splice(i, 1);
        continue;
      }
      i++;
    }
    if (sourcePath === undefined || targetPath === undefined) return;

    // 自身合并，直接加'z'闭合指令即可
    if (sourcePath === targetPath) {
      sourcePath.push([InstructionType.CLOSE]);
      mergePath = sourcePath;
    }
    // 不同路径需要进行合并
    else {
      if (sourceInfo.instruction === sourcePath[0]) {
        sourcePath = this._invertPath(sourcePath);
      }
      if (targetInfo.instruction === targetPath[targetPath.length - 1]) {
        targetPath = this._invertPath(targetPath);
      }
      targetPath.shift();
      mergePath = sourcePath.concat(targetPath);
    }

    // 合并后添加回路径段集合
    itemPaths.push(mergePath);
    this.target!.path = itemPaths.flat(1) as any;
    this._initPathControlPoints();
  }

  /**
   * 注册响应式，元素移动变换时，联动修改路径信息
   */
  private _observe(
    point: fabric.Object,
    callback: (
      value: { left: number; top: number },
      oldValue: { left: number; top: number }
    ) => void
  ) {
    let { left = 0, top = 0 } = point;

    Object.defineProperties(point, {
      left: {
        get: () => left,
        set: (value: number) => {
          if (left === value) return;
          const oldValue = { left, top };
          left = value;
          callback({ left, top }, oldValue);
        },
      },
      top: {
        get: () => top,
        set: (value: number) => {
          if (top === value) return;
          const oldValue = { left, top };
          top = value;
          callback({ left, top }, oldValue);
        },
      },
    });
  }

  /**
   * 触发编辑器事件
   */
  private _fire(eventName: string) {
    if (!this.target) return;

    // 标识区域便于测试
    this.target.set({
      backgroundColor: 'rgba(255, 125, 125, 0.8)'
    })

    if (eventName === 'update') {
      this.updatePath();
    }
  }

  /**
   * 添加事件监听
   */
  private _on(
    type: 'global' | 'canvas',
    eventName: string,
    handler: (e: any) => void
  ) {
    if (type === 'global') {
      window.addEventListener(eventName, handler);
    }

    if (type === 'canvas') {
      this._platform.on(eventName, handler);
    }

    this.listeners.push({ type, eventName, handler });
  }

  /**
   * 初始化监听事件
   */
  private _initEvents() {
    // 注册选中事件
    const registerSelectionEvent = () => {
      this._on('canvas', 'selection:created', (e) => {
        if (this._inbuiltStatus.cancelSelectEvent) return;
        this.focus(...e.selected);
      });
      this._on('canvas', 'selection:updated', (e) => {
        if (this._inbuiltStatus.cancelSelectEvent) return;
        this.focus(...e.selected);
      });
      this._on('canvas', 'selection:cleared', () => {
        if (this._inbuiltStatus.cancelSelectEvent) return;
        this.focus();
      });
    };

    // 注册快捷键
    const registerShortcutEvent = () => {
      // 快捷键监听
      let activeShortcut:
        | {
            key?: string;
            combinationKeys?: string[];
            onActivate: () => void;
            onDeactivate?: () => void;
          }
        | undefined;
      const shortcuts: NonNullable<typeof activeShortcut>[] = [
        {
          combinationKeys: ['alt'],
          onActivate: () => {
            this._inbuiltStatus.extraActions = false;
          },
          onDeactivate: () => {
            this._inbuiltStatus.extraActions = true;
          },
        },
        {
          combinationKeys: ['ctrl'],
          onActivate: () => {
            this._inbuiltStatus.autoPathMerge = true;
          },
          onDeactivate: () => {
            this._inbuiltStatus.autoPathMerge = false;
          },
        },
        {
          key: 'backspace',
          onActivate: () => {
            const { handlers, activeHandlerPoint, activePoints } = this.controllers;
            if (activeHandlerPoint) {
              const handler = handlers?.find((i) => i.point === activeHandlerPoint);
              if (handler) {
                this._inbuiltStatus.cancelSelectEvent = true;
                this.transferToLine(handler.belong!, handler.belongPosition!);
                this._updatePointHandlers();
                this._updateStyle();
                this._inbuiltStatus.cancelSelectEvent = false;
              }
            } else {
              this.remove(...activePoints);
            }
          },
        },
        {
          key: 'z',
          combinationKeys: ['ctrl'],
          onActivate: () => {
            if (this.records.undo.length > 1) {
              let record = this.records.undo.pop();
              if (record) {
                this.records.redo.push(record);
                record = this.records.undo[this.records.undo.length - 1];
                if (record) this._initializePath(record.path, record.left, record.top);
              }
            }
          }
        },
        {
          key: 'z',
          combinationKeys: ['ctrl', 'shift'],
          onActivate: () => {
            let record = this.records.redo.pop();
            if (record) {
              this.records.undo.push(record);
              this._initializePath(record.path, record.left, record.top);
            }
          }
        }
      ];
      const deactivate = () => {
        if (activeShortcut) {
          activeShortcut.onDeactivate?.();
          activeShortcut = undefined;
        }
      };
      const handleShortcutKey = (e: KeyboardEvent) => {
        let _key = e.key.toLowerCase();

        // 寻找所有匹配的按键
        const activateKeys = shortcuts.filter((shortcut) => {
          const { key, combinationKeys = [] } = shortcut;

          if (e.type === 'keyup' && key === _key) return false;

          if (!key && combinationKeys.length === 0) return false;

          if (
            // 没有匹配任何快捷键
            (key && key !== _key) ||
            // 没有匹配任何组合键
            combinationKeys.some(
              (combinationPrefix) => !e[`${combinationPrefix}Key`]
            )
          ) {
            return false;
          }

          return true;
        });
        activateKeys.sort((a, b) => {
          if (a.key && !b.key) return -1;
          return (b.combinationKeys?.length ?? 0) - (a.combinationKeys?.length ?? 0);
        });

        const shortcut = activateKeys[0];
        if (activeShortcut === shortcut) return;

        activeShortcut?.onDeactivate?.();

        activeShortcut = shortcut;

        activeShortcut?.onActivate();
      };
      this._on('global', 'keydown', handleShortcutKey.bind(this));
      this._on('global', 'keyup', handleShortcutKey.bind(this));
      // 需要考虑页面失焦状态，避免状态错误保留
      this._on('global', 'blur', deactivate);
    };

    // 注册双击直线指令变曲线指令事件
    const registerDbclickEvent = () => {
      this._on('canvas', 'mouse:dblclick', (e) => {
        const target = e.target;

        if (target[PATH_RECORD_INFO]?.type === EditorObjectType.MAJOR_POINT) {
          const { pre, next } = this._getAroundPoints(target);

          if (
            [pre, next].every(
              (item) => !item || item?.pointType === EditorObjectType.SUB_POINT
            )
          ) {
            this.transferToLine(target, 'both');
          } else {
            this.transferToCurce(target);
          }
        }

        if (target[PATH_RECORD_INFO]?.type === EditorObjectType.SUB_POINT) {
          const { cur, pre } = this._getAroundInstructions(
            target[PATH_RECORD_INFO].instruction!
          );

          if (cur[0] === InstructionType.BEZIER_CURVE) return;

          cur[0] = InstructionType.BEZIER_CURVE;

          // 二阶转三阶曲线
          this._updatePathInstruction(
            cur,
            FabricPathEditor.convertQuadraticToCubic(
              {
                x: pre![pre!.length - 2],
                y: pre![pre!.length - 1],
              } as Crood,
              cur
            )
          );
        }

        this._updatePointHandlers();
      });
    };

    // 注册画布路径合并事件
    const registerMergeEvent = () => {
      let attachSource: EditorControlPoint | undefined;
      let attachTarget: EditorControlPoint | undefined;
      let awaitAttachTargets: EditorControlPoint[] = [];
      this._on('canvas', 'mouse:down', () => {
        const { activePoint, points } = this.controllers;
        if (!activePoint) return;

        const { pre, next } = this._getAroundInstructions(
          activePoint[PATH_RECORD_INFO].instruction!
        );
        if (pre && next) return;

        attachSource = activePoint;
        awaitAttachTargets = points.filter((point) => {
          if (point === activePoint) return false;

          const { pre, next } = this._getAroundInstructions(
            point[PATH_RECORD_INFO].instruction!
          );
          if (pre && next) return false;

          return true;
        });
      });
      this._on('canvas', 'mouse:move', (e) => {
        if (!attachSource) return;

        attachTarget = undefined;

        awaitAttachTargets.forEach((point) => {
          if (
            this._inbuiltStatus.autoPathMerge &&
            point.containsPoint(e.pointer)
          ) {
            point.scale(1.2);
            attachTarget = point;
          } else {
            point.scale(1);
          }
        });
      });
      this._on('canvas', 'mouse:up', () => {
        // 合并分段路径
        if (attachSource && attachTarget) {
          this._mergePath(attachSource, attachTarget);
        }

        attachSource = undefined;
        attachTarget = undefined;
        awaitAttachTargets.forEach((point) => point.scale(1));
        awaitAttachTargets.length = 0;
      });
    };

    // 注册添加关键点事件
    const registerAddMajorEvent = () => {
      let newInstruction: Instruction | undefined;
      let upgradeInstruction: Instruction | undefined;
      let newPoint: EditorControlPoint | undefined;
      this._on('canvas', 'mouse:down:before', (event) => {
        const { e } = event;

        if (!this.target) return;

        // 判断是否是添加
        if (!this._inbuiltStatus.awaitAdd) return;

        // 如果点击在背景上则触发加点事件
        if (
          event.target[PATH_RECORD_INFO]?.type === EditorObjectType.BACKGROUND
        ) {
          const { activePoint } = this.controllers;
          if (!activePoint) return;

          // 如果当前没有聚焦端点（头尾节点）
          const { paths, path, pre, cur, next } = this._getAroundInstructions(
            activePoint[PATH_RECORD_INFO]!.instruction!
          );
          if (pre && next) return;

          const { x, y } = this._toRelativeCrood(e.offsetX, e.offsetY);
          const newPoint = fabric.util.transformPoint(
            new fabric.Point(x, y),
            fabric.util.invertTransform(this.source!.calcOwnMatrix())
          );

          if (!pre) {
            newInstruction = [InstructionType.START, newPoint.x, newPoint.y];
            upgradeInstruction = cur;
            cur[0] = InstructionType.LINE;
            path.unshift(newInstruction);
          }

          if (!next) {
            newInstruction = [InstructionType.LINE, newPoint.x, newPoint.y];
            upgradeInstruction = newInstruction;
            path.push(newInstruction);
          }

          this.target.path = paths.flat(1) as any;

          this._initPathControlPoints();
        }
      });
      this._on('canvas', 'mouse:down', () => {
        if (!newInstruction) return;
        newPoint = this._getInstructionMajorPoint(newInstruction);
        if (newPoint) this.focus(newPoint);
      });
      this._on('canvas', 'mouse:move', (event) => {
        const { e } = event;

        if (newPoint && upgradeInstruction) {
          // 如果鼠标还在点上不触发控制曲线作用，当移出后才触发，避免触发敏感
          if (
            newPoint.containsPoint(event.pointer) &&
            upgradeInstruction[0] !== InstructionType.QUADRATIC_CURCE
          )
            return;

          const { x, y } = this._toRelativeCrood(e.offsetX, e.offsetY);
          const controlPoint = fabric.util.transformPoint(
            new fabric.Point(x, y),
            fabric.util.invertTransform(this.source!.calcOwnMatrix())
          );
          if (upgradeInstruction[0] === InstructionType.QUADRATIC_CURCE) {
            upgradeInstruction[1] = controlPoint.x;
            upgradeInstruction[2] = controlPoint.y;
          } else {
            upgradeInstruction[0] = InstructionType.QUADRATIC_CURCE;
            upgradeInstruction.splice(1, 0, controlPoint.x, controlPoint.y);
          }
          this._updatePointHandlers();
        }
      });
      this._on('canvas', 'mouse:up', () => {
        newInstruction = undefined;
        upgradeInstruction = undefined;
        newPoint = undefined;
      });
    };

    // 注册更新事件
    const registerUpdateEvent = () => {
      this._on('canvas', 'object:modified', (e) => {
        this._fire('update');
      })
    };

    registerSelectionEvent();
    registerShortcutEvent();
    registerDbclickEvent();
    registerMergeEvent();
    registerAddMajorEvent();
    registerUpdateEvent();
  }

  /**
   * 进入路径编辑
   */
  async enterEditing(overwrite?: (clonePath: fabric.Path) => void) {
    if (!this.source || this.source.type !== 'path') {
      throw Error('Please observe target path before editing.');
    }

    /** 添加容器背景 */
    this._initBackground();

    /** 初始绘制环境 */
    this._initPlatformStatus();

    /** 初始操作路径对象 */

    // 克隆路径所在对象，用作操作而不影响原对象
    this.target = await new Promise<fabric.Path>((resolve) =>
      this.source!.clone(resolve)
    );

    // 修补路径，进行必要处理以减少后续操作时的额外计算
    this._patchPath(this.target);

    // // 消除偏移后需要使用新的路径信息初始化路径
    // const matrix = [...this.source.calcOwnMatrix()];
    // matrix[4] = 0;
    // matrix[5] = 0;
    // FabricPathEditor.initializePath(this.target, (fabric.util as any).joinPath(this.target.path), matrix);

    // 使用路径前提供二次调整路径的入口
    if (overwrite) overwrite(this.target);

    // 必要属性设置
    this.target[PATH_SYMBOL] = true;
    this.target.set({
      // 路径本身不可选中，后续通过操纵点和线条来更改路径
      selectable: false,
      // 防止因为缓存没有显示正确的路径
      objectCaching: false,
      // 只有触碰到路径上才出发点击事件
      perPixelTargetFind: true,
    });

    this._platform.add(this.target);

    // 由于需要多次添加关键点和控制点，如果不设置该配置，每次添加和移除都会渲染一次画布，设置为false后可以控制为1次渲染
    this._platform.renderOnAddRemove = false;

    /** 初始路径关键点 */
    this._initPathControlPoints();

    /** 初始路径控制点 */
    // this._createPathControlHandler();

    this._platform.renderOnAddRemove = true;

    this._platform.renderAll();

    /** 初始事件监听 */
    this._initEvents();

    // TODO: 测试
    this.focus(this.controllers.points[0], this.controllers.points[2]);
  }

  /**
   * 重新构建路径对象
   */
  private _initializePath(path: string, left: number, top: number) {
    if (!this.target) return;

    this.target.initialize(path as any);

    this.target.set({ left, top }).setCoords();

    this._initPathControlPoints(true);
    this._platform.renderAll();
  }

  updatePath(path?: string) {
    if (!this.target) return;

    const d = path ?? (fabric.util as any).joinPath(this.target!.path);
  
    const pre = this.records.undo[this.records.undo.length - 1];
    if (pre) {
      // 记录旧的路径中心点
      const oldPath = new fabric.Path(pre.path);
      const oldPathCenter = oldPath.getCenterPoint();

      // 重新初始路径对象使路径占有区域重置回正确区域，但偏移会丢失
      this.target.initialize(d as any);

      // 记录新的路径中心
      const newPathCenter = this.target.getCenterPoint();

      // 计算路径偏移差值
      const distance = fabric.util.transformPoint(
        new fabric.Point(
          newPathCenter.x - oldPathCenter.x,
          newPathCenter.y - oldPathCenter.y
        ),
        [1, 0, 0, 1, 0, 0]
      );

      // 设置回正确的偏移位置
      this.target.set({
        left: pre.left! + distance.x,
        top: pre.top! + distance.y,
      });

      this.target.setCoords();
    }

    // 记录操作历史
    this.records.redo.length = 0;
    this.records.undo.push({
      left: this.target.left!,
      top: this.target.top!,
      path: (fabric.util as any).joinPath(this.target!.path)
    });

    // 更新控制点
    this._initPathControlPoints(true);
    this._platform.renderAll();
  }

  /**
   * 离开路径编辑
   */
  leaveEditing() {}

  /**
   * 处理选中节点事件
   */
  private _updatePointHandlers() {
    const canvas = this._platform;

    const { activePoint } = this.controllers;

    // 如果没有活跃关键点则不需要绘制控制点
    if (!activePoint) {
      canvas.remove(
        ...this.controllers.handlers.map(i => [i.point, i.line]).flat(1)
      );
      this.controllers.handlers = [];
      this.controllers.activeHandlerPoint = undefined;
      return;
    }

    const { pre, cur, next } = this._getAroundInstructions(
      activePoint[PATH_RECORD_INFO].instruction!
    );

    const _handlers: {
      item: AroundPoint;
      belong: EditorControlPoint;
      belongPosition: 'pre' | 'next';
      hidden: boolean;
    }[] = [];
    [
      cur[0] === InstructionType.START && pre
        ? this._getAroundInstructions(pre).pre
        : pre,
      cur,
      next,
    ].map((instruction, index) => {
      if (!instruction) return;

      const point = this._getInstructionMajorPoint(instruction);
      if (!point) return;

      const aroundPoints = this._getAroundPoints(point);
      aroundPoints.pre &&
        _handlers.push({
          item: aroundPoints.pre,
          belong: point,
          belongPosition: 'pre' as const,
          hidden:
            index === 0 ||
            (index === 2 && instruction[0] === InstructionType.QUADRATIC_CURCE),
        });
      aroundPoints.next &&
        _handlers.push({
          item: aroundPoints.next,
          belong: point,
          belongPosition: 'next' as const,
          hidden:
            index === 2 ||
            (index === 0 &&
              (cur[0] === InstructionType.START ? pre : cur)?.[0] ===
                InstructionType.QUADRATIC_CURCE),
        });
    });

    // 绘制控制点
    const handlers = _handlers.map(
      ({ item, belong, belongPosition, hidden }) => {
        if (!item) return;

        const { point, pointType, instruction, instructionValueIdx } = item;

        if (!point) return;

        if (pointType !== EditorObjectType.SUB_POINT) return;

        const target =
          this.controllers.handlers.find(
            (handler) =>
              handler.belong === belong &&
              handler.belongPosition === belongPosition
          ) ?? this._createPathControlHandler();

        target.belong = belong;
        target.belongPosition = belongPosition;
        target.hidden = hidden;
        target.point[PATH_RECORD_INFO].instruction = instruction;
        target.point[PATH_RECORD_INFO].instructionValueIdx =
          instructionValueIdx;

        target.point.set({ visible: !hidden });
        target.line.set({ visible: !hidden });

        this._observe(target.point, ({ left, top }) => {
          const { x, y } = this._calcRelativeCrood({ left, top });

          target.line.set({
            x1: belong.left,
            y1: belong.top,
            x2: target.point.left,
            y2: target.point.top,
          });

          instruction[instructionValueIdx] = x;
          instruction[instructionValueIdx + 1] = y;

          // 如果需要镜像控制点
          if (!this._inbuiltStatus.extraActions) {
            if (target.mirror) target.mirror.mirror = undefined;
            target.mirror = undefined;
          } else if (
            this.controllers.activeHandlerPoint &&
            target.mirror &&
            !target.mirror.hidden
          ) {
            target.mirror.point.set({
              left: 2 * belong.left! - target.point.left!,
              top: 2 * belong.top! - target.point.top!,
            });
            target.mirror.line.set({
              x1: belong.left,
              y1: belong.top,
              x2: target.mirror.point.left,
              y2: target.mirror.point.top,
            });
          }

          // 更新对象的控制框区域，避免后续无法选中
          target.point.setCoords();
        });

        target.point.set(this._calcAbsolutePosition(point));

        return target;
      }
    );

    // 判断是否存在镜像控制
    for (const handler of handlers) {
      if (handler?.belongPosition === 'pre') {
        const _belong = handler.belong;
        if (!_belong) continue;

        const _mirror = handlers.find(
          (i) => i?.belong === _belong && i?.belongPosition === 'next'
        );

        if (
          handler !== undefined &&
          _mirror !== undefined &&
          handler.point.left! + _mirror.point.left! === _belong.left! * 2 &&
          handler.point.top! + _mirror.point.top! === _belong.top! * 2
        ) {
          handler.mirror = _mirror;
          _mirror.mirror = handler;
        }
      }
    }

    // 清空旧的控制柄
    canvas.remove(
      ...this.controllers.handlers.filter((i) => !handlers.includes(i)).map(i => [i.point, i.line]).flat(1)
    );

    this.controllers.handlers = handlers.filter(
      Boolean
    ) as EditorControlHandler[];
    if (handlers.every(handler => handler?.point !== this.controllers.activeHandlerPoint)) {
      this.controllers.activeHandlerPoint = undefined;
    }

    // 添加新的控制柄
    canvas.add(
      ...this.controllers.handlers.filter((i) => i.point.canvas === undefined).map(i => [i.point, i.line]).flat(1)
    );
  }

  /**
   * 更新样式
   */
  private _updateStyle = () => {
    const { points, handlers, activePoints, activeHandlerPoint } =
      this.controllers;
    points.forEach((point) => {
      if (activePoints.includes(point)) {
        point.item(0).set({
          fill: '#29ca6e',
        });
      } else {
        point.item(0).set({
          fill: '#ffffff',
        });
      }
    });
    handlers.forEach((handler) => {
      if (handler.point === activeHandlerPoint) {
        handler.point.item(0).set({
          stroke: '#4b4b4b',
        });
      } else {
        handler.point.item(0).set({
          stroke: '#bebebe',
        });
      }
    });
  };

  /**
   * 移动单个关键点的位置
   */
  move(
    point: EditorControlPoint,
    position: {
      left: number;
      top: number;
    }
  ) {
    const { left, top } = position;

    const selectionGroup = point.group;

    const { scaleX: preScaleX, scaleY: preScaleY } = point;
    const { scaleX: newScaleX, scaleY: newScaleY } = selectionGroup
      ? {
          scaleX: 1 / selectionGroup.scaleX!,
          scaleY: 1 / selectionGroup.scaleY!,
        }
      : { scaleX: 1, scaleY: 1 };

    point.set({
      scaleX: newScaleX,
      scaleY: newScaleY,
    });

    const instruction = point[PATH_RECORD_INFO].instruction!;

    const newCrood = this._calcRelativeCrood({ left, top });
    const dLeft = newCrood.x - (instruction[instruction.length - 2] as number);
    const dTop = newCrood.y - (instruction[instruction.length - 1] as number);

    const { path } = this._getAroundInstructions(
      point[PATH_RECORD_INFO].instruction!
    );
    const { handlers } = this.controllers;

    instruction[instruction.length - 2] = newCrood.x;
    instruction[instruction.length - 1] = newCrood.y;

    // 关联修改周围的控制点
    const { pre, next } = this._getAroundPoints(point);
    (
      [
        [pre, 'pre'],
        [next, 'next'],
      ] as [AroundPoint, string][]
    ).forEach(([aroundPoint, position]) => {
      if (aroundPoint?.pointType === EditorObjectType.SUB_POINT) {
        const { instruction, instructionValueIdx, point: pCrood } = aroundPoint;
        const crood = {
          left: pCrood.x + dLeft - newCrood.x,
          top: pCrood.y + dTop - newCrood.y,
        };

        crood.left *= preScaleX! / newScaleX!;
        crood.top *= preScaleY! / newScaleY!;

        instruction[instructionValueIdx] = newCrood.x + crood.left;
        instruction[instructionValueIdx + 1] = newCrood.y + crood.top;

        // 如果有控制点更新控制点
        const handler = handlers?.find(
          (i) => i.belong === point && i.belongPosition === position
        );
        if (handler) {
          if (this._inbuiltStatus.extraActions) {
            handler.point.set(
              this._calcAbsolutePosition({
                x: instruction[instructionValueIdx] as number,
                y: instruction[instructionValueIdx + 1] as number,
              })
            );
          } else {
            handler.line.set({
              x1: left,
              y1: top,
              x2: handler.point.left!,
              y2: handler.point.top!,
            });
          }
        }
      }
    });

    // 如果是路径段起始点且路径闭合需要同步最后一致指令节点
    const syncInstruction = path[path.length - 2];
    if (
      syncInstruction &&
      instruction !== syncInstruction &&
      syncInstruction[0] !== InstructionType.CLOSE &&
      path[0] === instruction &&
      path[path.length - 1][0] === InstructionType.CLOSE
    ) {
      syncInstruction[syncInstruction.length - 2] = newCrood.x;
      syncInstruction[syncInstruction.length - 1] = newCrood.y;
    }

    // 更新控制区域
    point.setCoords();
  }

  /**
   * 处理画布元素选中
   */
  focus(...selectedPoints: EditorControlPoint[]) {
    const canvas = this._platform;
    const { handlers } = this.controllers;

    this._inbuiltStatus.cancelSelectEvent = true;

    // 无论是否当前有活跃目标都先取消统一重新处理选中逻辑
    canvas.discardActiveObject();

    // 添加活跃组的响应式变化
    const addActiveSelectionObserve = (group: fabric.ActiveSelection) => {
      this._observe(group, () => {
        group._objects.forEach((object) => {
          if (object[PATH_RECORD_INFO].type !== EditorObjectType.MAJOR_POINT)
            return;

          const point = object as EditorControlPoint;
          const decomposeMatrix = fabric.util.qrDecompose(
            point.calcTransformMatrix()
          );
          const left = decomposeMatrix.translateX;
          const top = decomposeMatrix.translateY;

          this.move(point, { left, top });
        });
      });
    };

    // 添加单个活跃对象的响应式变化
    const addActivePointObserve = (point: EditorControlPoint) => {
      this._observe(point, ({ left, top }) => {
        if (point.group) return;

        this.move(point, { left, top });
      });
    };

    const majorPointList: EditorControlPoint[] = [];
    const subPointList: EditorControlPoint[] = [];

    if (selectedPoints.length) {
      selectedPoints.forEach((point) => {
        if (point[PATH_RECORD_INFO].type === EditorObjectType.MAJOR_POINT) {
          majorPointList.push(point);
        }

        if (point[PATH_RECORD_INFO].type === EditorObjectType.SUB_POINT) {
          const handle = handlers.find((i) => i.point === point);
          majorPointList.push(handle!.belong!);
          subPointList.push(point);
        }
      });

      if (selectedPoints.length > 1) {
        const activeSelection = new fabric.ActiveSelection(selectedPoints, {
          canvas,
          lockScalingFlip: true,
          // TODO: 暂不允许旋转，后续计算会出现精度问题导致多次变换后无法正确呈现位置
          lockRotation: true,
          originX: 'center',
          originY: 'center',
        });
        canvas.setActiveObject(activeSelection);
        addActiveSelectionObserve(activeSelection);
      } else {
        canvas.setActiveObject(selectedPoints[0]);
        addActivePointObserve(majorPointList[0]);
      }
    }

    this.controllers.activePoints = majorPointList;
    this.controllers.activePoint =
      majorPointList.length === 1 ? majorPointList[0] : undefined;
    this.controllers.activeHandlerPoint =
      subPointList.length === 1 ? subPointList[0] : undefined;

    this._updatePointHandlers();
    this._updateStyle();

    canvas.renderAll();

    this._inbuiltStatus.cancelSelectEvent = false;
  }

  /**
   * 删除节点
   */
  remove(...points: EditorControlPoint[]) {
    if (!this.target) return;

    points = points.filter(point => (
      point[PATH_RECORD_INFO].type === EditorObjectType.MAJOR_POINT &&
      point[PATH_RECORD_INFO].instruction !== undefined
    ));
    if (points.length === 0) return;

    const canvas = this._platform;
    const path = this.target.path as unknown as Instruction[];
    if (!path) return;

    /**
     * 如果是中间点将当前指令变为起始指令，否则直接删除当前关键点，
     * 并且拆分路径，下一条指令的关键点变为起始点，上一条指令变为结束点了，如果是自动闭合调整为非闭合状态
     */
    let itemPaths = this._splitPath(path);

    points.forEach((point) => {
      const { instruction } = point[PATH_RECORD_INFO];
      if (!instruction) return;

      const splitPathIdx = itemPaths.findIndex((i) =>
        i.includes(instruction)
      )!;
      const splitPath = itemPaths[splitPathIdx];
      const instructionIdx = splitPath.indexOf(instruction);

      // ① 拆分路径
      const pre = splitPath.slice(0, instructionIdx);
      const next = splitPath.slice(instructionIdx + 1);

      // ② 如果原本是闭合路径需要合并路径，但是要修改起始点
      if (next[next.length - 1]?.[0] === InstructionType.CLOSE) {
        next.pop();

        // 特殊情况：如果当前指令是开始指令并且路径闭合，需要删除最后关键点与起始点一致的
        const lastInstruction = next[next.length - 1];
        if (
          instructionIdx === 0 &&
          lastInstruction &&
          isEqual(
            lastInstruction.slice(lastInstruction.length - 2),
            instruction.slice(instruction.length - 2)
          )
        ) {
          next.pop();
        } else {
          const firstInstruction = pre[0];
          if (firstInstruction?.[0] === InstructionType.START) {
            firstInstruction[0] = InstructionType.LINE;
            if (
              isEqual(
                firstInstruction.slice(firstInstruction.length - 2),
                lastInstruction.slice(lastInstruction.length - 2)
              )
            ) {
              pre.shift();
            }
          }
        }
        next.push(...pre);
        itemPaths.splice(splitPathIdx, 1, next);
      } else {
        if (pre.length === 1 && pre[0][0] === InstructionType.START) {
          itemPaths.splice(splitPathIdx, 1, next);
        } else {
          itemPaths.splice(splitPathIdx, 1, pre, next);
        }
      }

      // 如果是中间点需要将关键点做为新的路径起始点
      if (instruction[0] !== InstructionType.START) {
        next.unshift(cloneDeep(instruction));
      }

      // ③ 重构起始点
      const newStartPoint = next[0];
      if (newStartPoint) {
        newStartPoint.splice(
          1,
          {
            [InstructionType.START]: 0,
            [InstructionType.LINE]: 0,
            [InstructionType.BEZIER_CURVE]: 4,
            [InstructionType.QUADRATIC_CURCE]: 2,
          }[newStartPoint[0]]
        );
        newStartPoint[0] = InstructionType.START;
      }
    });

    this.target.path = itemPaths.flat(1) as any;

    this._initPathControlPoints();

    this.focus();

    canvas.requestRenderAll();
  }

  /**
   * 将曲线指令转化为直线指令
   */
  transferToLine(point: EditorControlPoint, dir: 'pre' | 'next' | 'both') {
    if (!this.controllers.points.includes(point)) return;

    const { cur, next, pre } = this._getAroundInstructions(
      point[PATH_RECORD_INFO].instruction!
    );
    if (dir === 'pre' || dir === 'both') {
      const _pre = cur[0] === InstructionType.START ? pre : cur;
      if (_pre) {
        _pre.splice(
          1,
          {
            [InstructionType.BEZIER_CURVE]: 4,
            [InstructionType.QUADRATIC_CURCE]: 2,
          }[_pre[0]]
        );
        _pre[0] = InstructionType.LINE;
      }
    }

    if (dir === 'next' || dir === 'both') {
      if (next) {
        next.splice(
          1,
          {
            [InstructionType.BEZIER_CURVE]: 4,
            [InstructionType.QUADRATIC_CURCE]: 2,
          }[next[0]]
        );
        next[0] = InstructionType.LINE;
      }
    }

    this._platform.requestRenderAll();
  }

  /**
   * 普通指令转化为曲线指令
   */
  transferToCurce(point: EditorControlPoint) {
    if (!this.controllers.points.includes(point)) return;

    const { cur, pre, next } = this._getAroundInstructions(
      point[PATH_RECORD_INFO].instruction!
    );
    if (!pre && !next) return;

    const _pre =
      cur[0] === InstructionType.START && pre
        ? this._getAroundInstructions(pre).pre
        : pre;

    // 只有同时存在前后指令才能双击变曲线，单直线没有效果
    if (_pre && next) {
      const points = [_pre, cur, next].map((instruction) => ({
        x: instruction[instruction.length - 2] as number,
        y: instruction[instruction.length - 1] as number,
      }));

      const curve = (Bezier.quadraticFromPoints as any)(...points);
      const { t } = curve.project(points[1]);
      const splitCurves = curve.split(t);
      const insertPath = new fabric.Path(
        splitCurves.left.toSVG() + splitCurves.right.toSVG()
      );

      const __pre = cur[0] === InstructionType.START ? pre : cur;

      if (__pre && !CurceInstructionTypes.includes(__pre[0])) {
        this._updatePathInstruction(
          __pre,
          insertPath.path![1] as unknown as Instruction
        );
      }
      if (next && !CurceInstructionTypes.includes(next[0])) {
        this._updatePathInstruction(
          next,
          insertPath.path![3] as unknown as Instruction
        );
      }
    } else {
      const curPoint = {
        x: cur[cur.length - 2] as number,
        y: cur[cur.length - 1] as number,
      };
      const ins = (next ?? _pre)!;
      const secondPoint = {
        x: ins[ins.length - 2] as number,
        y: ins[ins.length - 1] as number,
      };
      const distance = Math.sqrt(
        Math.pow(curPoint.x - secondPoint.x, 2) +
          Math.pow(curPoint.y - secondPoint.y, 2)
      );
      const thirdPoint = {
        x:
          curPoint.x +
          ((secondPoint.y - curPoint.y) / distance) * (distance / 3),
        y:
          curPoint.y +
          ((secondPoint.x - curPoint.x) / distance) * (distance / 3),
      };

      if (_pre) {
        const _ins = cur[0] === InstructionType.START ? pre! : cur;
        this._updatePathInstruction(_ins, [
          InstructionType.QUADRATIC_CURCE,
          thirdPoint.x,
          thirdPoint.y,
          curPoint.x,
          curPoint.y,
        ]);
      } else if (next) {
        this._updatePathInstruction(next, [
          InstructionType.QUADRATIC_CURCE,
          thirdPoint.x,
          thirdPoint.y,
          secondPoint.x,
          secondPoint.y,
        ]);
      }
    }
  }

  /**
   * 销毁编辑器
   */
  destroy() {}
}

export default FabricPathEditor;
