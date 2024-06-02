import { fabric } from 'fabric';
import transform from './transform';

/**
 * 清除路径偏移
 * @param path fabric路径对象
 */
const clearPathOffset = (path: fabric.Path) => {
  const section = path.path as unknown as [string, ...number[]];
  section.forEach((item, pathIdx) => {
    const [, ...croods] = item as unknown as [type: string, ...croods: number[]];
    for (let i = 0; i < croods.length; i += 2) {
      const { x, y } = transform(
        {
          x: section[pathIdx][i + 1] as number,
          y: section[pathIdx][i + 2] as number,
        },
        [
          {
            translate: {
              x: -path.pathOffset.x,
              y: -path.pathOffset.y,
            },
          },
        ],
      );
      section[pathIdx][i + 1] = x;
      section[pathIdx][i + 2] = y;
    }
  });
  path.pathOffset = new fabric.Point(0, 0);
};

export default clearPathOffset;
