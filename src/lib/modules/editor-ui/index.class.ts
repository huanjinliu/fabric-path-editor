import { fabric } from 'fabric';
import EditorModule from '../base.class';
import Editor from '../editor/index.class';
import VizPath from '../../vizpath.class';

export type ThemeDecorator<InputType, OutputType = InputType> = (
  customObject: InputType,
  callback?: () => void,
) => OutputType;

export type ThemeConfigurator<T extends Record<string, any> = {}> = (
  editor: Editor,
  shareState: T,
) => {
  path?: (decorator: ThemeDecorator<fabric.Path>, pathObject: fabric.Path) => void;
  node: (decorator: ThemeDecorator<fabric.Object>) => fabric.Object;
  dot: (decorator: ThemeDecorator<fabric.Object>) => fabric.Object;
  line: (decorator: ThemeDecorator<fabric.Line>) => fabric.Line;
};

export const DEFAULT_THEME = {
  path: (decorator, pathObject) => {
    pathObject.set({
      stroke: '#4b4b4b',
      strokeWidth: 1,
    });
  },
  node: () => {
    const circle = new fabric.Circle({
      radius: 3,
      fill: '#ffffff',
      stroke: '#4b4b4b',
      strokeWidth: 1,
    });

    return circle;
  },
  dot: () => {
    const circle = new fabric.Circle({
      radius: 3,
      fill: '#ffffff',
      stroke: '#4b4b4bcc',
      strokeWidth: 1,
      strokeDashArray: [1, 1],
    });

    return circle;
  },
  line: () => {
    const line = new fabric.Line([0, 0, 0, 0], {
      stroke: '#bebebe',
      strokeWidth: 1,
    });

    return line;
  },
} as Required<ReturnType<ThemeConfigurator<object>>>;

class EditorUI<T extends Record<string, any> = object> extends EditorModule {
  static ID = 'editor-ui';

  /**
   * 主题配置器
   */
  configurator: ThemeConfigurator<T>;

  /**
   * 主题
   */
  theme: Required<ReturnType<ThemeConfigurator<T>>> | null = null;

  /**
   * 共享状态
   */
  shareState: T;

  /**
   * 元素渲染更新回调映射
   */
  objectPreRenderCallbackMap = new Map<fabric.Object, () => void>([]);

  constructor(configurator: ThemeConfigurator<T>, initialShareState: T) {
    super();
    this.configurator = configurator;
    this.shareState = initialShareState;
  }

  /**
   * 重新渲染对象样式
   */
  refresh() {
    const editor = this.vizPath?.context.find(Editor);
    if (!editor) return;

    const canvas = editor.canvas;
    if (!canvas) return;

    canvas?._objects.map((object) => {
      this.objectPreRenderCallbackMap.get(object)?.();
    });
  }

  unload() {
    this.shareState = {} as T;
    this.objectPreRenderCallbackMap.clear();
    this.theme = null;
  }

  load(vizPath: VizPath) {
    const editor = vizPath.context.find(Editor);
    if (!editor) {
      throw new TypeError('Please use editor module before using ui module.');
    }
    this.shareState = new Proxy(this.shareState, {
      // 每次共享状态修改都会触发UI更新
      set: (target, p, newValue, receiver) => {
        const needRefresh = target[p as string] !== newValue;
        const result = Reflect.set(target, p, newValue, receiver);
        if (needRefresh) this.refresh();
        return result;
      },
    });
    this.theme = {
      path: (decorator, pathObject) => pathObject,
      ...this.configurator(editor, this.shareState),
    };
  }
}

export default EditorUI;
