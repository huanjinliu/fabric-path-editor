export { default as VizPathCreator } from './lib';

/** 编辑器模块 */
export { default as Editor } from './lib/modules/editor/index.class';
export { default as EditorBackground } from './lib/modules/editor-background/index.class';
export { default as EditorUI } from './lib/modules/editor-ui/index.class';
export { default as EditorShortcut } from './lib/modules/editor-shortcut/index.class';
export { default as EditorBezier } from './lib/modules/editor-bezier/index.class';

/** 必要类型导出 */
export type { default as VizPath } from './lib/vizpath.class';
export type { Path, Instruction } from './lib';
export type { ThemeConfigurators } from './lib/modules/editor-ui/index.class';

export * as utils from './lib/utils';
