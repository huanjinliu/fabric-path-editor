import { fabric } from 'fabric';
import isEqual from 'lodash-es/isEqual';
import cloneDeep from 'lodash-es/cloneDeep';
import defaults from 'lodash-es/defaults'
import round from 'lodash-es/round';
import { CREATE_DEFAULT_LINE, CREATE_DEFAULT_POINTER, CREATE_DEFAULT_TRIGGER } from './default-create';

/** 用于标记路径编辑器元素，便于后续快速查找和辨别元素 */
const PATH_SYMBOL = Symbol('fabric-path-editor-symbol');

/** 用于记录控制器（包含关键点和控制点）的信息 */
const PATH_CONTROLLER_INFO = Symbol('fabric-path-editor-controller-info');

interface EditorOptions {
}

/**
 * 控制类型
 */
enum ControlType {
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
  CLOSE = 'z'
}

/**
 * 曲线类型
 */
const CurceInstructionTypes = [InstructionType.QUADRATIC_CURCE, InstructionType.BEZIER_CURVE];

/** 指令类型 */
type Instruction = [type: InstructionType, ...croods: number[]];

/**
 * @controlType 控制类型
 */
interface EditorControlPoint extends fabric.Group {
  [PATH_SYMBOL]: true;
  [PATH_CONTROLLER_INFO]: {
    type: ControlType;
    instruction?: Instruction;
    instructionValueIdx?: number;
  }
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
  private _platform: fabric.Canvas

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
    points: EditorControlPoint[],
    preHandler?: {
      point: EditorControlPoint,
      line: fabric.Line,
    },
    nextHandler?: {
      point: EditorControlPoint,
      line: fabric.Line,
    }
    activePoint?: EditorControlPoint,
    activeHandlerPoint?: EditorControlPoint,
  } = { points: [] };

  /**
   * 监听事件
   */
  listeners: {
    type: 'global' | 'canvas',
    eventName: string;
    handler: (e: any) => void;
  }[] = []

  /**
   * 内置状态
   */
  private _inbuiltStatus = {
    cancelHandlerMirrorMove: false
  }

  /**
   * 存储画布原始状态
   */
  private _storePlatformStatus: {
    canvasSelection: boolean;
    objectSelections: WeakMap<fabric.Object, Boolean>
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
      const [, ...croods] = item as unknown as [type: string, ...croods: number[]];
      for (let i = 0; i < croods.length; i += 2) {
        let x = _path[pathIdx][i + 1];
        let y = _path[pathIdx][i + 2];

        if (scale !== undefined) {
          x *= scale.x;
          y *= scale.y;
        }

        if (rotate !== undefined) {
          x = Math.cos((rotate * Math.PI) / 180) * x - Math.sin((rotate * Math.PI) / 180) * y;
          y = Math.sin((rotate * Math.PI) / 180) * x + Math.cos((rotate * Math.PI) / 180) * y;
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
      const [, ...croods] = item as unknown as [type: string, ...croods: number[]];
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
      new fabric.Point(newPathCenter.x - oldPathCenter.x, newPathCenter.y - oldPathCenter.y),
      matrix
    );

    path.set({
      left: oldCroods.left! + distance.x,
      top: oldCroods.top! + distance.y
    });

    path.setCoords();
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
        y: -path.pathOffset.y
      }
    });

    // ② 闭合的路径如果在闭合指令前没有回到起始点，补充一条回到起始点的指令
    const itemPaths = this._splitPath(path.path as unknown as Instruction[]);
    for(const itemPath of itemPaths) {
      const isAutoClose = itemPath[itemPath.length - 1][0] === InstructionType.CLOSE;
      if (isAutoClose) {
        const startPoint = itemPath[0].slice(itemPath[0].length - 2);
        const endPoint = itemPath[itemPath.length - 2].slice(itemPath[itemPath.length - 2].length - 2);
        if (
          // 如果路径只有一个起始点且闭合[M,Z]
          itemPath[0] === itemPath[itemPath.length - 2]
          // 或者路径闭合但是最后一个关键点不完全等于起始点
          || (endPoint[0] !== startPoint[0] || endPoint[1] !== startPoint[1])
        ) {
          itemPath.splice(itemPath.length - 1, 0, [InstructionType.LINE, startPoint[0], startPoint[1]] as Instruction);
        }
      }
    }

    path.path = itemPaths.flat(1) as unknown as fabric.Point[];
    path.pathOffset = new fabric.Point(0, 0);
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
      objectSelections: new WeakMap(canvas._objects.map(object => ([object, object.selectable ?? true])))
    };

    // 画布禁止框选
    canvas.selection = false;
    canvas.preserveObjectStacking = true,
      canvas.controlsAboveOverlay = true,
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
    const splitPaths = path.reduce((paths, instruction, idx, arr) => {
      if (!instruction) return paths;
      if (instruction[0] === InstructionType.START && paths[paths.length - 1].length) paths.push([]);
      paths[paths.length - 1].push(instruction);
      if (instruction[0] === InstructionType.CLOSE && idx !== arr.length - 1) paths.push([]);
      return paths;
    }, [[]] as (typeof path)[]);
    return splitPaths;
  }

  /**
   * 通过关键点获取指令信息（cur当前指令、pre上一个指令、next下一个指令）
   */
  private _getPointInstructions(point: EditorControlPoint) {
    const instruction = point[PATH_CONTROLLER_INFO].instruction!;

    const path = this.target!.path!;

    // 提取路径段
    const itemPaths = this._splitPath(path as unknown as Instruction[]);
    const _path = itemPaths.find(path => path.includes(instruction))!;

    // 获取前后指令
    const instructionIdx = _path.indexOf(instruction);

    let preInstruction = _path[instructionIdx - 1];
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
      cur: instruction,
      pre: preInstruction ?? null,
      next: nextInstruction ?? null,
    } as {
      path: Instruction[],
      cur: Instruction,
      pre: Instruction | null,
      next: Instruction | null,
    }
  }


  /**
   * 通过关键点获取前后点位的信息
   */
  private _getPointAroundPoints(point: EditorControlPoint) {
    // 因为获取指令信息时会跳过闭合指令，所以这里都不需要考虑闭合指令
    const { path, cur, pre, next } = this._getPointInstructions(point);

    type AroundPoint = {
      instruction: Instruction;
      instructionValueIdx: number;
      point: Crood;
      pointType: ControlType;
    };

    const curPoint: AroundPoint = {
      instruction: cur,
      instructionValueIdx: cur.length - 2,
      point: {
        x: cur[cur.length - 2] as number,
        y: cur[cur.length - 1] as number,
      },
      pointType: ControlType.MAJOR_POINT
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
                y: pre[pre.length - 3] as number
              },
              pointType: ControlType.SUB_POINT
            };
          } else {
            const prePre = path[2 % (path.length - 1)];
            prePoint = {
              instruction: prePre,
              instructionValueIdx: prePre.length - 2,
              point: {
                x: prePre[prePre.length - 2] as number,
                y: prePre[prePre.length - 1] as number
              },
              pointType: ControlType.MAJOR_POINT
            };
          }
        }
        break;
      }
      case InstructionType.LINE:
        if (pre) prePoint = {
          instruction: pre,
          instructionValueIdx: pre.length - 2,
          point: {
            x: pre[pre.length - 2] as number,
            y: pre[pre.length - 1] as number
          },
          pointType: ControlType.MAJOR_POINT
        };
        break;
      case InstructionType.QUADRATIC_CURCE:
        prePoint = {
          instruction: cur,
          instructionValueIdx: 1,
          point: { x: cur[1] as number, y: cur[2] as number },
          pointType: ControlType.SUB_POINT
        };
        break;
      case InstructionType.BEZIER_CURVE:
        prePoint = {
          instruction: cur,
          instructionValueIdx: 3,
          point: { x: cur[3] as number, y: cur[4] as number },
          pointType: ControlType.SUB_POINT
        }
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
          ? ControlType.SUB_POINT
          : ControlType.MAJOR_POINT
      }
    }

    return {
      cur: curPoint,
      pre: prePoint,
      next: nextPoint
    };
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
  private _initPathControlPoints() {
    const canvas = this._platform;
    const pathObj = this.target;
    if (!canvas || !pathObj) return;

    // 移除旧的关键点
    const oldPoints = this.controllers.points;
    if (oldPoints.length) canvas.remove(...oldPoints);

    // 记录新的操作点和控制
    const points: EditorControlPoint[] = [];

    // 创建路径关键点的操作点（即实际路径上的节点，而非曲线上的虚拟点）
    this._splitPath(pathObj.path as unknown as Instruction[])?.forEach((path) => {

      const firstInstruction = path[0];

      path.forEach((item, index) => {
        const instruction = item;

        // 闭合点不添加关键点
        if (instruction[0] === InstructionType.CLOSE) return;

        // 如果下一个指令是闭合点，则不添加关键点
        // 因为路径补丁的时候遇到闭合点会添加一条到起始点的路径，所以当前关键点正好和起始点一致
        if (path[index + 1]?.[0] === InstructionType.CLOSE) return;

        // 关键点的路径位置
        const [x, y] = instruction.slice(instruction.length - 2) as number[];

        // 重用旧节点
        const point = oldPoints.pop() ?? new fabric.Group([CREATE_DEFAULT_POINTER()], {
          originX: 'center',
          originY: 'center',
          // 选中时不出现选中框
          hasBorders: false,
          hasControls: false
        }) as EditorControlPoint;

        point[PATH_SYMBOL] = true;
        point[PATH_CONTROLLER_INFO] = {
          type: ControlType.MAJOR_POINT,
          instruction,
          instructionValueIdx: instruction.length - 2
        };

        // 监听移动修改对应路径信息
        this._observe(point, ({ left, top }, oldPosition) => {
          const newCrood = this._calcRelativeCrood({ left, top });
          const oldCrood = this._calcRelativeCrood(oldPosition);

          const { path } = this._getPointInstructions(point);
          const { preHandler, nextHandler } = this.controllers;

          const dLeft = newCrood.x - (instruction[instruction.length - 2] as number);
          const dTop = newCrood.y - (instruction[instruction.length - 1] as number);
          if (preHandler) {
            preHandler.point.set({
              left: preHandler.point.left! + dLeft,
              top: preHandler.point.top! + dTop,
            });
          }
          if (nextHandler) {
            nextHandler.point.set({
              left: nextHandler.point.left! + dLeft,
              top: nextHandler.point.top! + dTop,
            });
          }
          instruction[instruction.length - 2] = newCrood.x;
          instruction[instruction.length - 1] = newCrood.y;

          // 如果是路径段起始点且路径闭合需要同步最后一致指令节点
          const syncInstruction = path[path.length - 2];
          if (
            syncInstruction
            && instruction !== syncInstruction
            && syncInstruction[0] !== InstructionType.CLOSE
            && path[0] === instruction
            && path[path.length - 1][0] === InstructionType.CLOSE
          ) {
            syncInstruction[syncInstruction.length - 2] = newCrood.x;
            syncInstruction[syncInstruction.length - 1] = newCrood.y;
          }

          // 更新控制区域
          point.setCoords();
        });

        // 将目标对象的变换应用到操作点上
        point.set(this._calcAbsolutePosition({ x, y }));

        // 添加控制点事件——改用canvas全局代理来选中节点
        // this._addControlPointEvents(point);

        points.push(point);
      })
    });

    // 添加进画布
    canvas.add(...points);
    this.controllers.points = points;
  }

  /**
   * 初始路径变换控制点
   */
  private _initPathControlHandlers() {
    ['pre', 'next'].forEach((type) => {
      const point = new fabric.Group([CREATE_DEFAULT_TRIGGER()], {
        originX: 'center',
        originY: 'center',
        hasBorders: false,
        hasControls: false,
      }) as EditorControlPoint;

      point[PATH_SYMBOL] = true;
      point[PATH_CONTROLLER_INFO] = {
        type: ControlType.SUB_POINT
      };

      const line = CREATE_DEFAULT_LINE();

      // 不直接添加，用到才添加
      // canvas.add(point, line);

      this.controllers[`${type}Handler`] = { point, line };
    });

    return this.controllers;
  }

  /**
   * 注册响应式，元素移动变换时，联动修改路径信息
   */
  private _observe(point: EditorControlPoint, callback: (value: { left: number; top: number }, oldValue: { left: number; top: number }) => void) {
    let { left = 0, top = 0 } = point;

    Object.defineProperties(point, {
      left: {
        get: () => left,
        set: (value: number) => {
          if (left === value) return;
          const oldValue = { left, top };
          left = value;
          callback({ left, top }, oldValue);
        }
      },
      top: {
        get: () => top,
        set: (value: number) => {
          if (top === value) return;
          const oldValue = { left, top };
          top = value;
          callback({ left, top }, oldValue);
        }
      }
    })
  }

  /**
   * 添加事件监听
   */
  private _on(type: 'global' | 'canvas', eventName: string, handler: (e: any) => void) {
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
    const registerSelectionEvents = () => {
      this._on('canvas', 'selection:created', (e) => {
        this.focus(...e.selected);
      })
      this._on('canvas', 'selection:updated', (e) => {
        this.focus(...e.selected);
      })
      this._on('canvas', 'selection:cleared', () => {
        this.focus();
      })
    }

    // 注册快捷键
    const registerShortcutEvents = () => {
      // 快捷键监听
      let activeShortcut: {
        key?: string;
        combinationKeys?: string[];
        onActivate: () => void;
        onDeactivate?: () => void;
      } | undefined;
      const shortcuts: NonNullable<typeof activeShortcut>[] = [
        {
          combinationKeys: ['alt'],
          onActivate: () => {
            this._inbuiltStatus.cancelHandlerMirrorMove = true;
          },
          onDeactivate: () => {
            this._inbuiltStatus.cancelHandlerMirrorMove = false;
          }
        },
        {
          key: 'backspace',
          onActivate: () => {
            this.remove();
          }
        }
      ];
      const deactivate = () => {
        if (activeShortcut) {
          activeShortcut.onDeactivate?.();
          activeShortcut = undefined;
        }
      }
      const handleShortcutKey = (e: KeyboardEvent) => {
        let _key = e.key.toLowerCase();

        shortcuts.forEach((shortcut) => {
          const { key, combinationKeys = [] } = shortcut;

          if (!key && combinationKeys.length === 0) return;

          if (e.type === 'keyup') _key = '';

          if (
            // 没有匹配任何快捷键
            (key && key !== _key) ||
            // 没有匹配任何组合键
            combinationKeys.some(combinationPrefix => !e[`${combinationPrefix}Key`])
          ) {
            if (e.type === 'keyup') deactivate();
            return;
          }

          if (activeShortcut === shortcut) return;

          activeShortcut?.onDeactivate?.();

          activeShortcut = shortcut;

          activeShortcut?.onActivate();
        })
      }
      this._on('global', 'keydown', handleShortcutKey.bind(this));
      this._on('global', 'keyup', handleShortcutKey.bind(this));
      // 需要考虑页面失焦状态，避免状态错误保留
      this._on('global', 'blur', deactivate);
    }

    // 注册双击直线指令变曲线指令事件
    const registerDbclickEvents = () => {
      this._on('canvas', 'mouse:dblclick', (e) => {
        const target = e.target;

        if (target[PATH_CONTROLLER_INFO]?.type === ControlType.MAJOR_POINT) {
          const { pre, next } = this._getPointAroundPoints(target);

          if ([pre, next].every(item => !item || item?.pointType === ControlType.SUB_POINT)) {
            this.transferToLine(target, 'both');
          } else {
            this.transferToCurce(target);
          }
        }

        if (target[PATH_CONTROLLER_INFO]?.type === ControlType.SUB_POINT) {
          const { cur } = this._getPointInstructions(target);

          if (cur[0] === InstructionType.BEZIER_CURVE) return;

          cur[0] = InstructionType.BEZIER_CURVE;
          cur.splice(1, 0, cur[cur.length - 4], cur[cur.length - 3]);
        }

        this._updatePointHandlers();
      });
    }

    registerSelectionEvents();
    registerShortcutEvents();
    registerDbclickEvents();
  }

  /**
   * 进入路径编辑
   */
  async enterEditing(overwrite?: (clonePath: fabric.Path) => void) {
    if (!this.source || this.source.type !== 'path') {
      throw Error('Please observe target path before editing.');
    }

    /** 初始绘制环境 */
    this._initPlatformStatus();

    /** 初始操作路径对象 */

    // 克隆路径所在对象，用作操作而不影响原对象
    this.target = await new Promise<fabric.Path>((resolve) => this.source!.clone(resolve));

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
      objectCaching: false
    });

    this._platform.add(this.target);

    // 由于需要多次添加关键点和控制点，如果不设置该配置，每次添加和移除都会渲染一次画布，设置为false后可以控制为1次渲染
    this._platform.renderOnAddRemove = false;

    /** 初始路径关键点 */
    this._initPathControlPoints();

    /** 初始路径控制点 */
    this._initPathControlHandlers();

    this._platform.renderOnAddRemove = true;

    this._platform.renderAll();

    /** 初始事件监听 */
    this._initEvents();

    // TODO: 测试
    this.focus(this.controllers.points[0])
  }

  /**
   * 离开路径编辑
   */
  leaveEditing() { }

  /**
   * 处理选中节点事件
   */
  private _updatePointHandlers() {
    const canvas = this._platform;
    const { preHandler, nextHandler, activePoint } = this.controllers;

    if (preHandler) canvas.remove(preHandler.point, preHandler.line);
    if (nextHandler) canvas.remove(nextHandler.point, nextHandler.line);

    if (!activePoint) return;

    let isInitialMirror = true;

    const { pre, next } = this._getPointAroundPoints(activePoint);

    // 绘制控制点
    [pre, next].forEach((item, index) => {
      if (!item) return;
  
      const { point, pointType, instruction, instructionValueIdx } = item;

      const target = [preHandler, nextHandler][index];
      const mirrorTarget = [nextHandler,preHandler][index];
      if (!target) return;

      if (pointType !== ControlType.SUB_POINT) {
        this._observe(target.point, () => { });
        return;
      }

      if (!point) return;

      target.point[PATH_CONTROLLER_INFO].instruction = instruction;
      target.point[PATH_CONTROLLER_INFO].instructionValueIdx = instructionValueIdx;

      this._observe(target.point, ({ left, top }) => {
        const { x, y } = this._calcRelativeCrood({ left, top });

        target.line.set({
          x1: activePoint.left,
          y1: activePoint.top,
          x2: target.point.left,
          y2: target.point.top,
        });

        instruction[instructionValueIdx] = x;
        instruction[instructionValueIdx + 1] = y;

        // 如果需要镜像控制点
        if (this._inbuiltStatus.cancelHandlerMirrorMove) isInitialMirror = false;
        else if (isInitialMirror && this.controllers.activeHandlerPoint && mirrorTarget) {
          mirrorTarget.point.set({
            left: 2 * activePoint.left! - target.point.left!,
            top: 2 * activePoint.top! - target.point.top!
          });
          mirrorTarget.line.set({
            x1: activePoint.left,
            y1: activePoint.top,
            x2: mirrorTarget.point.left,
            y2: mirrorTarget.point.top,
          });
        }

        // 更新对象的控制框区域，避免后续无法选中
        target.point.setCoords();
      });

      target.point.set(this._calcAbsolutePosition(point));

      canvas.add(target.line, target.point);
    })

    // 写在后面是因为前面的point还没有赋值位置无法做判断
    isInitialMirror = (true
      && preHandler !== undefined
      && nextHandler !== undefined
      && (preHandler.point.left! + nextHandler.point.left! === activePoint.left! * 2)
      && (preHandler.point.top! + nextHandler.point.top! === activePoint.top! * 2)
    );
  }

  /**
   * 处理画布元素选中
   */
  focus(...selectedPoints: EditorControlPoint[]) {
    const canvas = this._platform;
    const { preHandler, nextHandler, activePoint } = this.controllers;

    const point = selectedPoints[0];

    const initHandlersStyle = () => {
      [preHandler, nextHandler].forEach(handler => {
        if (handler) {
          // 样式恢复
          handler.point.item(0).set({
            stroke: '#bebebe'
          })
        }
      });
      this.controllers.activeHandlerPoint = undefined;
    }

    const selectSubPoint = (point: EditorControlPoint) => {
      const handler = [preHandler, nextHandler].find(i => i?.point === point);
      if (handler) {
        // 样式替换
        handler.point.item(0).set({
          stroke: '#4b4b4b'
        })
      }
      this.controllers.activeHandlerPoint = point;
    }

    initHandlersStyle();

    if (point) {
      if (point[PATH_CONTROLLER_INFO].type === ControlType.MAJOR_POINT) {
        activePoint?.item(0).set({
          fill: '#ffffff'
        });
        this.controllers.activePoint = point;
        point.item(0).set({
          fill: '#29ca6e'
        });
        this._updatePointHandlers();
      }

      if (point[PATH_CONTROLLER_INFO].type === ControlType.SUB_POINT) {
        selectSubPoint(point);
      }

      canvas.setActiveObject(point);
    } else {
      activePoint?.item(0).set({
        fill: '#ffffff'
      });
      this.controllers.activePoint = undefined;
      canvas.discardActiveObject();

      this._updatePointHandlers();
    }

    canvas.renderAll();
  }

  /**
   * 删除节点
   */
  remove(point = this.controllers.activeHandlerPoint ?? this.controllers.activePoint) {
    if (!point || !this.target) return;

    const canvas = this._platform;

    const path = this.target.path as unknown as Instruction[];
    if (!path) return;

    const { type, instruction } = point[PATH_CONTROLLER_INFO];
    if (!instruction) return;

    const { preHandler } = this.controllers;

    switch (type) {
      // 如果是关键点直接删除当前关键点，并且拆分路径，下一条指令的关键点变为起始点，上一条指令变为结束点了，如果是自动闭合调整为非闭合状态
      case ControlType.MAJOR_POINT: {
        const itemPaths = this._splitPath(path);
        const splitPathIdx = itemPaths.findIndex(i => i.includes(instruction))!;

        const instructionIdx = itemPaths[splitPathIdx].indexOf(instruction);
        const splitPath = cloneDeep(itemPaths[splitPathIdx]);

        // ① 拆分路径
        const pre = splitPath.slice(0, instructionIdx);
        const next = splitPath.slice(instructionIdx + 1);

        // ② 如果原本是闭合路径需要合并路径，但是要修改起始点
        if (next[next.length - 1]?.[0] === InstructionType.CLOSE) {
          next.pop();

          // 特殊情况：如果当前指令是开始指令并且路径闭合，需要删除最后关键点与起始点一致的
          const lastInstruction = next[next.length - 1];
          if (
            instructionIdx === 0
            && lastInstruction
            && isEqual(lastInstruction.slice(lastInstruction.length - 2), instruction.slice(instruction.length - 2))
          ) {
            next.pop();
          } else {
            const firstInstruction = pre[0];
            if (firstInstruction?.[0] === InstructionType.START) {
              firstInstruction[0] = InstructionType.LINE;
              if (isEqual(firstInstruction.slice(firstInstruction.length - 2), lastInstruction.slice(lastInstruction.length - 2))) {
                pre.shift();
              }
            }
          }
          next.push(...pre);
          itemPaths.splice(splitPathIdx, 1, next);
        } else {
          itemPaths.splice(splitPathIdx, 1, pre, next);
        }

        // ③ 重构起始点
        const newStartPoint = next[0];
        if (newStartPoint) {
          newStartPoint.splice(1, {
            [InstructionType.START]: 0,
            [InstructionType.LINE]: 0,
            [InstructionType.BEZIER_CURVE]: 4,
            [InstructionType.QUADRATIC_CURCE]: 2
          }[newStartPoint[0]]);
          newStartPoint[0] = InstructionType.START;
        }

        this.target.path = itemPaths.flat(1) as any;

        this._initPathControlPoints();
        break;
      }
      // 只有曲线指令才有控制点，删除控制点将直接降级成直线指令
      case ControlType.SUB_POINT:
        const target = this.controllers.activePoint!;
        this.transferToLine(target, point === preHandler?.point ? 'pre' : 'next');
        this.focus(target);
        break;
      default:
        break;
    }

    canvas.requestRenderAll();
  }

  /**
   * 将曲线指令转化为直线指令
   */
  transferToLine(point: EditorControlPoint, dir: 'pre' | 'next' | 'both') {
    if (!this.controllers.points.includes(point)) return;

    const { cur, next, pre } = this._getPointInstructions(point); 
    if (dir === 'pre' || dir === 'both') {
      const _pre = cur[0] === InstructionType.START
        ? pre
        : cur;
      if (_pre) {
        _pre.splice(1, {
          [InstructionType.BEZIER_CURVE]: 4,
          [InstructionType.QUADRATIC_CURCE]: 2
        }[_pre[0]]);
        _pre[0] = InstructionType.LINE;
      }
    }

    if (dir === 'next' || dir === 'both') {
      if (next) {
        next.splice(1, {
          [InstructionType.BEZIER_CURVE]: 4,
          [InstructionType.QUADRATIC_CURCE]: 2
        }[next[0]]);
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

    const { cur, pre, next } = this._getPointAroundPoints(point);

    // 如果两边都有控制点
    const middlePoint =  {
      x: ((next ?? cur).point.x + (pre ?? cur).point.x) / 2,
      y: ((next ?? cur).point.y + (pre ?? cur).point.y) / 2
    };
    if (pre) {
      const curvePoint1 = {
        x: cur.point.x + pre.point.x - middlePoint.x,
        y: cur.point.y + pre.point.y - middlePoint.y
      }
      if (pre.pointType === ControlType.MAJOR_POINT) {
        const instructions = this._getPointInstructions(point);
        const _pre = cur.instruction[0] === InstructionType.START
          ? instructions.pre
          : instructions.cur;
        if (_pre) {
          _pre[0] = InstructionType.QUADRATIC_CURCE;
          _pre.splice(1, 0, curvePoint1.x, curvePoint1.y);
        }
      }
    }
    if (next) {
      const curvePoint2 = {
        x: cur.point.x + next.point.x - middlePoint.x,
        y: cur.point.y + next.point.y - middlePoint.y
      }
      if (next.pointType === ControlType.MAJOR_POINT) {
        next.instruction[0] = InstructionType.QUADRATIC_CURCE;
        next.instruction?.splice(1, 0, curvePoint2.x, curvePoint2.y);
      }
    }
  }

  /**
   * 销毁编辑器
   */
  destroy() { }
}

export default FabricPathEditor;