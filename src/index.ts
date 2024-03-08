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

    const pathList = path.path as unknown as Instruction[];

    // ① 有些路径自身带偏移，如果不消除，后续的所有关键点、控制点的编辑都要额外处理路径自身的偏移
    FabricPathEditor.transformPath(path, {
      translate: {
        x: -path.pathOffset.x,
        y: -path.pathOffset.y
      }
    });

    // ② 闭合的路径如果在闭合指令前没有回到起始点，补充一条回到起始点的指令
    const isAutoClose = pathList[pathList.length - 1][0] === InstructionType.CLOSE;
    if (isAutoClose) {
      const startPoint = pathList[0].slice(pathList[0].length - 2);
      const endPoint = pathList[pathList.length - 2].slice(pathList[pathList.length - 2].length - 2);
      if (
        // 如果路径只有一个起始点且闭合[M,Z]
        pathList[0] === pathList[pathList.length - 2]
        // 或者路径闭合但是最后一个关键点不完全等于起始点
        || (endPoint[0] !== startPoint[0] || endPoint[1] !== startPoint[1])
      ) {
        pathList.splice(pathList.length - 1, 0, [InstructionType.LINE, startPoint[0], startPoint[1]] as Instruction);
      }
    }

    // if (this.target !== this.target) {
    //   this.target.set({
    //     left: this.target.left! - this.target.pathOffset.x,
    //     top: this.target.top! - this.target.pathOffset.y
    //   });
    // }
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
   * 通过关键点获取指令信息（cur当前指令、pre上一个指令、next下一个指令）
   */
  private _getPointInstructions(point: EditorControlPoint) {
    const instruction = point[PATH_CONTROLLER_INFO].instruction;

    const path = this.target?.path as unknown as (typeof instruction)[];
    if (!path) return { cur: null, next: null, pre: null };

    // 获取前后指令
    const instructionIdx = path.indexOf(instruction);

    let preInstruction = path[instructionIdx - 1];
    let nextInstruction = path[instructionIdx + 1];

    // 如果没有上一个指令，则判断是否是闭合路径，如果是闭合路径则倒数第二个指令视为上一个指令
    const isClosePath = path[path.length - 1]?.[0] === InstructionType.CLOSE;
    if (isClosePath && !preInstruction) {
      preInstruction = path[path.length - 2];
    }

    // 如果有下一个指令且下一个指令是闭合指令，则指向起始指令
    if (nextInstruction && nextInstruction[0] === InstructionType.CLOSE) {
      nextInstruction = path[0];
    }

    return {
      cur: instruction,
      pre: preInstruction ?? null,
      next: nextInstruction ?? null,
    }
  }

  /**
   * 通过指令获取其关键点
   */
  private _getInstructionPoint(instruction: Instruction) {
    return this.controllers.points.find(i => i[PATH_CONTROLLER_INFO].instruction === instruction);
  }

  /**
   * 通过关键点获取前后点位的信息
   */
  private _getPointAroundPoints(point: EditorControlPoint) {
    const { cur, pre, next } = this._getPointInstructions(point);
    if (!cur) return { cur: null, pre: null, next: null };

    type AroundPoint = {
      instruction: Instruction;
      instructionValueIdx: number;
      point: Crood | null;
    };
    let prePoint: AroundPoint | null = null;
    let nextPoint: AroundPoint | null = null;

    switch (cur[0]) {
      case InstructionType.START:
        if (pre?.[0] === InstructionType.QUADRATIC_CURCE) {
          prePoint = {
            instruction: pre,
            instructionValueIdx: pre.length - 2,
            point: {
              x: pre[pre.length - 2] as number,
              y: pre[pre.length - 1] as number
            }
          };
        }
        if (pre?.[0] === InstructionType.BEZIER_CURVE) {
          prePoint = {
            instruction: pre,
            instructionValueIdx: pre.length - 4,
            point: {
              x: pre[pre.length - 4] as number,
              y: pre[pre.length - 3] as number
            }
          };
        }
        break;
      case InstructionType.LINE:
        if (pre) prePoint = {
          instruction: pre,
          instructionValueIdx: pre.length - 2,
          point: {
            x: pre[pre.length - 2] as number,
            y: pre[pre.length - 1] as number
          }
        };
        break;
      case InstructionType.QUADRATIC_CURCE:
        prePoint = {
          instruction: cur,
          instructionValueIdx: 1,
          point: { x: cur[1] as number, y: cur[2] as number }
        };
        break;
      case InstructionType.BEZIER_CURVE:
        prePoint = {
          instruction: cur,
          instructionValueIdx: 3,
          point: { x: cur[3] as number, y: cur[4] as number }
        }
        break;
      // 闭合指令没有关键点，永远不会触发该case
      case InstructionType.CLOSE:
        break;
      default:
        break;
    }

    if (next && next[0] !== InstructionType.CLOSE) nextPoint = {
      instruction: next,
      instructionValueIdx: 1,
      point: { x: next[1] as number, y: next[2] as number }
    }

    return {
      cur: {
        instruction: cur,
        instructionValueIdx: cur.length - 2,
        point: {
          x: cur[cur.length - 2] as number,
          y: cur[cur.length - 1] as number,
        }
      },
      pre: prePoint,
      next: nextPoint
    };
  }


  /**
   * 将相对坐标点转化为带元素本身变换的偏移位置
   */
  private _withSourceTransform(crood: Crood) {
    const _point = fabric.util.transformPoint(
      new fabric.Point(crood.x, crood.y),
      this.source!.calcOwnMatrix()
    );

    return { left: _point.x, top: _point.y };
  }

  /**
   * 移除元素本身变换
   */
  private _invertSourceTransform(crood: Crood) {
    const _point = fabric.util.transformPoint(
      new fabric.Point(crood.x, crood.y),
      fabric.util.invertTransform(this.source!.calcOwnMatrix())
    );

    return { left: _point.x, top: _point.y };
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

    const path = pathObj.path as unknown as Instruction[];

    // 创建路径关键点的操作点（即实际路径上的节点，而非曲线上的虚拟点）
    path?.forEach((item, pathIdx) => {
      const instruction = item;

      // 闭合点不添加关键点
      if (instruction[0] === InstructionType.CLOSE) return;

      // 如果下一个指令是闭合点，且当前关键点正好和起始点一致，则不添加关键点
      if (path[pathIdx + 1]?.[0] === InstructionType.CLOSE) return;

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
      this._observe(point, ({ left, top }) => {
        const { pre } = this._getPointInstructions(point);
        const { preHandler, nextHandler } = this.controllers;

        const dLeft = left - (instruction[instruction.length - 2] as number);
        const dTop = top - (instruction[instruction.length - 1] as number);
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
        instruction[instruction.length - 2] = left;
        instruction[instruction.length - 1] = top;

        // 如果是起始点且闭合路径需要同步闭合路径的节点
        if (instruction[0] === InstructionType.START && pre) pre[pre.length - 2] = left;
        if (instruction[0] === InstructionType.START && pre) pre[pre.length - 1] = top;

        // 更新控制区域
        point.setCoords();
      });

      // 将目标对象的变换应用到操作点上
      point.set(this._withSourceTransform({ x, y }));

      // 添加控制点事件——改用canvas全局代理来选中节点
      // this._addControlPointEvents(point);

      points.push(point);
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
    let _left = point.left ?? 0;
    let _top = point.top ?? 0;

    Object.defineProperties(point, {
      left: {
        get: () => _left,
        set: (value: number) => {
          if (_left === value) return;
          const oldValue = { x: _left, y: _top };
          _left = value;
          callback(this._invertSourceTransform({ x: _left, y: _top }), this._invertSourceTransform(oldValue));
        }
      },
      top: {
        get: () => _top,
        set: (value: number) => {
          if (_top === value) return;
          const oldValue = { x: _left, y: _top };
          _top = value;
          callback(this._invertSourceTransform({ x: _left, y: _top }), this._invertSourceTransform(oldValue));
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
      // 节点选中监听事件
      this._on('canvas', 'selection:created', (e) => {
        this.focus(...e.selected);
      })
      this._on('canvas', 'selection:updated', (e) => {
        this.focus(...e.selected);
      })
      this._on('canvas', 'selection:cleared', (e) => {
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

    registerSelectionEvents();
    registerShortcutEvents();
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
    // this.remove(this.controllers.points[2])
  }

  /**
   * 离开路径编辑
   */
  leaveEditing() { }

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

    const deselectOldMajorPoint = (point?: EditorControlPoint) => {
      if (!point) return;

      point.item(0).set({
        fill: '#ffffff'
      });

      const { preHandler, nextHandler } = this.controllers;

      if (preHandler) {
        canvas.remove(preHandler.point);
        canvas.remove(preHandler.line);
      }

      if (nextHandler) {
        canvas.remove(nextHandler.point);
        canvas.remove(nextHandler.line);
      }
    }

    const selectNewMajorPoint = (point: EditorControlPoint) => {
      point.item(0).set({
        fill: '#29ca6e'
      });

      const { cur, pre, next } = this._getPointAroundPoints(point);

      // console.log(cur, pre, next);

      const { preHandler, nextHandler } = this.controllers;

      let isInitialMirror = true;

      // 绘制控制点
      [
        {
          target: preHandler,
          mirrorTarget: nextHandler,
          instruction: pre,
          hidden: !pre?.point || !cur || cur.instruction[0] === InstructionType.LINE,
        },
        {
          target: nextHandler,
          mirrorTarget: preHandler,
          instruction: next,
          hidden: !next?.point || next.instruction[0] === InstructionType.LINE
        }
      ].forEach(({ target, mirrorTarget, instruction, hidden }) => {
        if (!target) return;

        if (hidden) {
          this._observe(target.point, () => { });
          return;
        }

        if (!instruction?.point) return;

        target.point[PATH_CONTROLLER_INFO].instruction = instruction.instruction;
        target.point[PATH_CONTROLLER_INFO].instructionValueIdx = instruction.instructionValueIdx;

        this._observe(target.point, ({ left, top }) => {
          target.line.set({
            x1: point.left,
            y1: point.top,
            x2: target.point.left,
            y2: target.point.top,
          });

          instruction.instruction[instruction.instructionValueIdx] = left;
          instruction.instruction[instruction.instructionValueIdx + 1] = top;

          // 如果需要镜像控制点
          if (this._inbuiltStatus.cancelHandlerMirrorMove) isInitialMirror = false;
          else if (isInitialMirror && this.controllers.activeHandlerPoint && mirrorTarget) {
            mirrorTarget.point.set({
              left: 2 * point.left! - target.point.left!,
              top: 2 * point.top! - target.point.top!
            });
            mirrorTarget.line.set({
              x1: point.left,
              y1: point.top,
              x2: mirrorTarget.point.left,
              y2: mirrorTarget.point.top,
            });
          }

          // 更新对象的控制框区域，避免后续无法选中
          target.point.setCoords();
        });

        target.point.set(this._withSourceTransform(instruction.point));

        canvas.add(target.line, target.point);
      })

      // 写在后面是因为前面的point还没有赋值位置无法做判断
      isInitialMirror = (true
        && preHandler !== undefined
        && nextHandler !== undefined
        && (preHandler.point.left! + nextHandler.point.left! === point.left! * 2)
        && (preHandler.point.top! + nextHandler.point.top! === point.top! * 2)
      );

      canvas.renderAll();
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
        deselectOldMajorPoint(activePoint);
        selectNewMajorPoint(point)
        this.controllers.activePoint = point;
      }
      if (point[PATH_CONTROLLER_INFO].type === ControlType.SUB_POINT) {
        selectSubPoint(point);
      }
      canvas.setActiveObject(point);
    } else {
      deselectOldMajorPoint(activePoint);
      this.controllers.activePoint = undefined;
      canvas.discardActiveObject();
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

    switch (type) {
      // 如果是关键点直接删除当前关键点，并且拆分路径，下一条指令的关键点变为起始点，上一条指令变为结束点了，如果是自动闭合调整为非闭合状态
      case ControlType.MAJOR_POINT: {
        const index = path.indexOf(instruction);
        const newPath = cloneDeep(path);

        // ① 拼接旧的起始点
        const preInstructions = newPath.splice(0, index + 1);
        // 移除当前的指令
        preInstructions.pop();
        // 如果第一个是起始点，直接移除
        if (newPath.length && preInstructions[0]?.[0] === InstructionType.START) preInstructions.shift();
        // 删除了关键点已经不可能是闭合路径了
        if (newPath[newPath.length - 1]?.[0] === InstructionType.CLOSE) newPath.pop();
        newPath.push(...preInstructions);

        // 特殊情况：如果当前指令是开始指令并且路径闭合，需要删除最后关键点与起始点一致的
        const lastInstruction = newPath[newPath.length - 1];
        if (
          instruction[0] === InstructionType.START
          && lastInstruction
          && isEqual(lastInstruction.slice(lastInstruction.length - 2), instruction.slice(1))
        ) {
          newPath.pop();
        }

        // ② 重构起始点
        const newStartPoint = newPath[0];
        if (newStartPoint) {
          newStartPoint.splice(1, {
            [InstructionType.START]: 0,
            [InstructionType.LINE]: 0,
            [InstructionType.BEZIER_CURVE]: 4,
            [InstructionType.QUADRATIC_CURCE]: 2
          }[newStartPoint[0]]);
          newStartPoint[0] = InstructionType.START;
        }

        this.target.path = newPath as any;

        this._initPathControlPoints();
        break;
      }
      // 只有曲线指令才有控制点，删除控制点将直接降级成直线指令
      case ControlType.SUB_POINT:
        instruction.splice(1, {
          [InstructionType.BEZIER_CURVE]: 4,
          [InstructionType.QUADRATIC_CURCE]: 2
        }[instruction[0]]);
        instruction[0] = InstructionType.LINE;
        this.focus(this.controllers.activePoint!);
        break;
      default:
        break;
    }

    canvas.requestRenderAll();
  }


  /**
   * 销毁编辑器
   */
  destory() { }
}

export default FabricPathEditor;