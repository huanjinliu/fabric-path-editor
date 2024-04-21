(function (fabric) {
  'use strict';

  function _toPrimitive(t, r) {
    if ("object" != typeof t || !t) return t;
    var e = t[Symbol.toPrimitive];
    if (void 0 !== e) {
      var i = e.call(t, r || "default");
      if ("object" != typeof i) return i;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return ("string" === r ? String : Number)(t);
  }
  function _toPropertyKey(t) {
    var i = _toPrimitive(t, "string");
    return "symbol" == typeof i ? i : i + "";
  }
  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }

  var Editor = /*#__PURE__*/_createClass(function Editor() {
    _classCallCheck(this, Editor);
  });

  // 单路径
  // const d = 'M 50 50z';
  // const d = 'M26.7846 -47 L109.923 97';
  // const d = 'M26.7846 -47L109.923 97H-56.3538z';
  // const d = 'M 26.7846 -47 Q 88.3538 5 109.923 97';
  // const d = 'M91 26.5C91 62.1223 62.1223 91 26.5 91S-38 62.1223 -38 26.5S-9.1223 -38 26.5 -38S91 -9.1223 91 26.5z';
  // const d = 'M 91 26.5 C 91 62.1223 62.1223 91 26.5 91 C -9.122300000000003 91 -38 62.1223 -38 26.5 C -38 -9.122300000000003 -9.1223 -38 26.5 -38 C 62.122299999999996 -38 91 -9.1223 91 26.5 z';
  const d = 'M5 -39c-29.8233 0 -54 24.1767 -54 54c0 22.3749 13.6084 41.5716 33 49.7646V93L16.0001 69H50c29.8233 0 54 -24.1767 54 -54S79.8233 -39 50 -39H5z';
  // 复合路径
  // const d = 'L-188.7846 -47L-100.923 97H-256.3538 z M91 26.5C91 62.1223 62.1223 91 26.5 91S-38 62.1223 -38 26.5S-9.1223 -38 26.5 -38S91 -9.1223 91 26.5z';
  // const d = 'L-188.7846 -47L-100.923 97H-256.3538 M91 26.5C91 62.1223 62.1223 91 26.5 91S-38 62.1223 -38 26.5S-9.1223 -38 26.5 -38S91 -9.1223 91 26.5';
  // const d = 'M 50 50 L 100 100 Q 150 50 100 0 Q 0 0 50 50'
  // const d = 'M 50 50 L 100 100 Q 150 50 100 0 C 80 -50 0 0 50 50z'
  // const d = 'M 50 50 L 100 100 L 100 0 C 80 -50 0 0 50 50z'
  // 创建画布
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  const fabricCanvas = new fabric.fabric.Canvas(canvas, {
      width: document.body.clientWidth,
      height: document.body.clientHeight,
      selection: false,
  });
  const path = new fabric.fabric.Path(d, {
      originX: 'center',
      originY: 'center',
      left: fabricCanvas.getWidth() / 2,
      top: fabricCanvas.getHeight() / 2,
      objectCaching: false,
      noScaleCache: false,
      fill: 'transparent',
      stroke: '#333',
      strokeWidth: 2,
  });
  fabricCanvas.add(path);
  fabricCanvas.renderAll();
  // 添加路径编辑器
  // const editor = new FabricPathEditor(fabricCanvas);
  // editor.observe(path);
  // editor.enterEditing();
  // editor.leaveEditing();
  // editor.destroy();
  // 添加尺寸更改监听
  new ResizeObserver(() => {
      fabricCanvas.setDimensions({
          width: document.body.clientWidth,
          height: document.body.clientHeight,
      });
      fabricCanvas.renderAll();
  }).observe(document.body);
  console.log(Editor);

})(fabric);
