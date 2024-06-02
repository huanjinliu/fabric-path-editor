import { fabric } from 'fabric';
import type { Theme } from 'src/lib/modules/editor-ui/index.class';

const createLine: Theme['line'] = () => {
  const line = new fabric.Line([0, 0, 0, 0], {
    stroke: '#bebebe',
    strokeWidth: 1,
    strokeDashArray: [4, 3],
  });

  return line;
};

export default createLine;