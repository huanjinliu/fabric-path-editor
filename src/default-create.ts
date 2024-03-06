import { fabric } from 'fabric';

/** 创建默认控制点 */
export const CREATE_DEFAULT_POINTER = () => {
  const object = new fabric.Circle({
    strokeWidth: 4,
    radius: 6,
    fill: '#ffffff',
    stroke: '#4b4b4b',
    originX: 'center',
    originY: 'center'
  });

  return object;
};

/** 创建默认线条 */
export const CREATE_DEFAULT_LINE = () =>
  new fabric.Line([0, 0, 0, 0], {
    stroke: '#bebebe',
    strokeWidth: 1,
    strokeDashArray: [4, 3],
    strokeUniform: true,
    selectable: false,
    evented: false,
    originX: 'center',
    originY: 'center'
  });

/** 创建默认默认左右侧拓展点 */
export const CREATE_DEFAULT_TRIGGER = () => {
  const object = new fabric.Circle({
    radius: 5,
    fill: '#bebebe',
    originX: 'center',
    originY: 'center'
  });
  return object;
};

/** 默认路径样式 */
export const SET_DEFUALT_PATH_STYLE = (path: fabric.Path) => {
  path.set({ stroke: '#4b4b4b', strokeWidth: 2 });
};