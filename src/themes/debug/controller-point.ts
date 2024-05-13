import { fabric } from 'fabric';
import type { Theme } from '..';

let arr = [
  'red',
  'orange',
  'blue',
  'green'
]

let index = 0;

const createDefaultPoint: Theme['controllerPoint'] = (decorator) => {
  const circle = new fabric.Circle({
    radius: 8,
    // fill: '#bebebe',
    fill: arr[(index++) % 4],
    stroke: '#bebebe',
    strokeWidth: 2,
  });

  const object = decorator(circle);
  // object.on('selected', () => {
  //   circle.set({
  //     stroke: '#333',
  //   });
  //   object.canvas?.requestRenderAll();
  // });

  // object.on('deselected', () => {
  //   circle.set({
  //     stroke: '#bebebe',
  //   });
  //   object.canvas?.requestRenderAll();
  // });

  return object;
};

export default createDefaultPoint;