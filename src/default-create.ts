import { fabric } from 'fabric';

/** 创建默认控制点 */
export const CREATE_DEFAULT_POINTER = (isMajor = true) => {
  const object = new fabric.Circle({
    strokeWidth: 4,
    radius: 6,
    fill: '#ffffff',
    stroke: '#4b4b4b',
    originX: 'center',
    originY: 'center'
  });
  object.on('mouseover', () => {
    object.set({ fill: '#7ef4ad' });
    object.canvas?.renderAll();
  });
  object.on('mouseout', () => {
    object.set({ fill: object.canvas?.getActiveObject() === object ? '#29ca6e' : '#ffffff' });
    object.canvas?.renderAll();
  });
  object.on('selected', () => {
    object.set({ fill: '#29ca6e' });
    object.canvas?.renderAll();
  });
  object.on('deselected', () => {
    object.set({ fill: '#ffffff' });
    object.canvas?.renderAll();
  });

  if (!isMajor) object.set({ opacity: 0.2 });

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
    evented: false
  });

/** 创建默认默认左右侧拓展点 */
export const CREATE_DEFAULT_TRIGGER = () => {
  const object = new fabric.Circle({
    radius: 5,
    fill: '#bebebe',
    originX: 'center',
    originY: 'center'
  });
  object.on('mouseover', () => {
    object.set({
      strokeWidth: 4,
      radius: 4,
      fill: '#ffffff',
      stroke: '#4b4b4b'
    });
    object.canvas?.renderAll();
  });
  object.on('mouseout', () => {
    object.set({
      strokeWidth: 0,
      radius: 5,
      fill: '#bebebe',
      stroke: 'transparent'
    });
    object.canvas?.renderAll();
  });
  return object;
};

/** 默认路径样式 */
export const SET_DEFUALT_PATH_STYLE = (path: fabric.Path) => {
  path.set({ stroke: '#4b4b4b', strokeWidth: 2 });
};