
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function (fabric) {
    'use strict';

    var fabricPathEditor = () => {
        console.log(fabric.fabric, '!!!'); /** 编辑器配置 */
        /**
         * 默认的变换信息
         */
        const DEFAULT_TRANSFORM = {
            translate: [0, 0],
            scale: [1, 1],
            rotate: 0
        };
        /**
         * 弧形文本编辑器 —— 基于fabric.js实现
         *
         * 一段弧形路径数据是由多个指令组合而成，其中包含以下“指令”：
         *
         * ① 设置起始点
         * ['M', x1, y1]
         *
         * ② 连接直线
         * ['L', x1, y1]
         *
         * ③ 连接二阶贝塞尔曲线
         * ['Q', x1, y1, x2, y2]
         *
         * ④ 连接三阶贝塞尔曲线
         * ['C', x1, y1, x2, y2, x3, y3]
         *
         * ⑤ 设置路径闭合
         * ['Z']
         */
        class ArcTextEditor {
            constructor(el, options) {
                /**
                 * 画布文档指令
                 */
                this.$el = null;
                /**
                 * fabric画布
                 */
                this.canvas = null;
                /**
                 * 路径
                 */
                this.path = "";
                /**
                 * 文本内容
                 */
                this.content = "";
                /**
                 * 路径对象
                 */
                this.pathObj = null;
                /**
                 * 弧形文本对象
                 */
                this.arcText = null;
                /**
                 * 参考线
                 */
                this.lines = [];
                /**
                 * 操作点
                 */
                this.points = [];
                /**
                 * 变换信息
                 */
                this.transform = JSON.parse(JSON.stringify(DEFAULT_TRANSFORM));
                /**
                 * 是否处于路径编辑状态
                 */
                this.isEditing = false;
                /**
                 * 是否正在等待添加新的指令
                 */
                this.isWaitForAdd = false;
                /**
                 * 存储window对象上的事件监听，用于销毁时移除，防止内存泄漏
                 */
                this._windowListeners = [];
                this.$el = el;
                // 创建fabric画布
                this.canvas = new fabric.fabric.Canvas(el, Object.assign(Object.assign({}, options), { selection: false, preserveObjectStacking: true }));
                // 修改fabric默认控制器样式，统一一下样式
                fabric.fabric.Object.prototype.borderColor = "#bebebe";
                fabric.fabric.Object.prototype.cornerColor = "#4b4b4b";
                fabric.fabric.Object.prototype.cornerSize = 8;
                fabric.fabric.Object.prototype.borderDashArray = [3, 4];
                // 初始化画布监听事件
                this.initListeners();
            }
            /**
             * 编辑器是否已初始化路径对象及文本对象，未初始状态下无法启动路径编辑
             */
            get initialized() {
                return this.arcText !== null;
            }
            /**
             * 设置路径字符串，错误路径不报错但会抛出警告⚠️
             *
             * ① 未初始的情况下初始路径及文本对象
             *
             * ② 已初始的情况下将更新当前路径
             *
             * @param string path 路径数据字符串
             *
             * @example
             * d('M 248 166 C 292 65 464 166 248 296 C 31 166 204 65 248 166z');
             */
            d(path) {
                var _a;
                try {
                    this.path = path;
                    if (!this.initialized)
                        this.init();
                    else
                        this.updatePath(this.path);
                    (_a = this.canvas) === null || _a === void 0 ? void 0 : _a.renderAll();
                }
                catch (_b) {
                    this.path = "";
                    this.pathObj = null;
                    this.arcText = null;
                    console.warn("Arc text editor: 请设置有效的路径字符串！");
                }
            }
            /**
             * 写入文本内容，会覆盖旧的内容
             */
            write(content) {
                this.content = content;
                if (this.initialized)
                    this.rebuild("update");
            }
            /**
             * 开启路径编辑
             */
            enterEditing() {
                if (this.isEditing)
                    return;
                this.isEditing = true;
                if (this.initialized)
                    this.rebuild("init");
            }
            /**
             * 结束路径编辑
             */
            leaveEditing() {
                if (!this.isEditing)
                    return;
                this.isEditing = false;
                this.clearOperationElements();
            }
            /**
             * 初始化监听事件
             */
            initListeners() {
                // 添加浏览器事件监听
                this.addWindowListeners();
                // 添加画布事件监听
                this.addCanvasListeners();
            }
            /**
             * 添加浏览器事件监听
             */
            addWindowListeners() {
                this._windowListeners = [
                    {
                        type: "keydown",
                        handler: (e) => {
                            var _a;
                            // 如果是编辑状态下并且按住Alt键，将进入等待添加新指令状态
                            this.isWaitForAdd = e.altKey;
                            // 删除当前操作点
                            if (e.key === "Delete" || e.keyCode === /* Delete key code */ 46) {
                                const target = (_a = this.canvas) === null || _a === void 0 ? void 0 : _a.getActiveObject();
                                if (target && this.points.includes(target)) {
                                    this.handleRemovePoint(target);
                                }
                            }
                        }
                    },
                    {
                        type: "keyup",
                        handler: (e) => {
                            this.isWaitForAdd = e.altKey;
                        }
                    }
                ];
                this._windowListeners.forEach(({ type, handler }) => {
                    window.addEventListener(type, handler);
                });
            }
            /**
             * 添加fabric画布事件监听
             */
            addCanvasListeners() {
                const canvas = this.canvas;
                canvas.on("mouse:down:before", () => {
                    var _a;
                    this._preFocusPoint = (_a = this.canvas) === null || _a === void 0 ? void 0 : _a.getActiveObject();
                });
                canvas.on("mouse:down", this.handleClickCanvas.bind(this));
                canvas.on("mouse:up", () => {
                    this._preFocusPoint = undefined;
                });
                canvas.on("object:moving", this.handleMoveCanvas.bind(this));
                // canvas.on('object:modified', () => {});
            }
            /**
             * 处理画布点击
             */
            handleClickCanvas({ e, target }) {
                var _a, _b;
                if (this.isEditing && this.isWaitForAdd) {
                    // 如果点击到画布空白区域则添加新的路径操作点
                    if (target === null) {
                        this.addPathPoint(e.offsetX, e.offsetY);
                    }
                    // 如果添加状态下先后点击第一个点和最后一个点且路径尚未闭合，则闭合路径
                    const path = (_b = (_a = this.pathObj) === null || _a === void 0 ? void 0 : _a.path) !== null && _b !== void 0 ? _b : [];
                    const instruction = path[path.length - 1];
                    if (!instruction)
                        return;
                    if (!this._preFocusPoint || !target)
                        return;
                    if (this._preFocusPoint === target)
                        return;
                    if ([this._preFocusPoint, target].every((item) => {
                        const isFirstPoint = item.instructionIdx === 0 && item.pointIdx === 1;
                        const isLastPoint = item.instructionIdx === path.length - 1 &&
                            item.pointIdx === instruction.length - 2;
                        return isFirstPoint || isLastPoint;
                    })) {
                        this.closePath();
                    }
                }
            }
            /**
             * 初始路径和文本对象
             */
            init(position) {
                const canvas = this.canvas;
                this.path = this.path || "M 0 0";
                // fabric路径对象
                this.pathObj = new fabric.fabric.Path(this.path, {
                    fill: "transparent",
                    // stroke: 'transparent',
                    stroke: "#000",
                    strokeWidth: 4,
                    objectCaching: false,
                    selectable: false,
                    originX: "center",
                    originY: "center"
                });
                // fabric文本对象
                this.arcText = new fabric.fabric.Text(this.content, {
                    fontSize: 20,
                    objectCaching: false,
                    left: position ? position.x : canvas.getWidth() / 2,
                    top: position ? position.y : canvas.getHeight() / 2,
                    originX: "center",
                    originY: "center",
                    selectable: false,
                    evented: false,
                    // @ts-ignore
                    path: this.pathObj
                });
                this.transform.translate = [
                    this.arcText.left - this.pathObj.left,
                    this.arcText.top - this.pathObj.top
                ];
                // 不需要再添加路径对象了，当成为文本的路径就被包含在里面了
                canvas.add(this.arcText);
            }
            /**
             * 重新构建路径并更新弧形文本对象
             * @param type 重新构建的原因
             * @param handler 传入深拷贝路径点数据，返回新的路径点数据
             */
            rebuild(cause, handler = (_) => _) {
                var _a;
                const canvas = this.canvas;
                const path = JSON.parse(JSON.stringify((_a = this.pathObj.path) !== null && _a !== void 0 ? _a : []));
                canvas.renderOnAddRemove = false;
                if (cause === "init") {
                    this.rebuildOperationElements(false);
                }
                else {
                    // 组合最新的路径字符串
                    const newPathD = fabric.fabric.util.joinPath(handler(path));
                    this.updatePath(newPathD);
                    // 指令数量有变化的时候重构操作元素
                    if (["add", "delete"].includes(cause)) {
                        this.rebuildOperationElements(false);
                    }
                }
                canvas.renderOnAddRemove = true;
                canvas.renderAll();
            }
            /**
             * 更新当前路径，会重新初始化弧形文本对象以对应路径新的偏移和尺寸
             */
            updatePath(d) {
                var _a;
                const pathObj = this.pathObj;
                // 记录旧的路径中心点
                const oldPathCenter = pathObj.getCenterPoint();
                // 使用新的路径重新构建路径对象
                pathObj.initialize(d);
                // 记录新的路径中心的
                const newPathCenter = pathObj.getCenterPoint();
                // 更新刻字对象的尺寸及偏移
                this.arcText.initialize(this.content);
                (_a = this.arcText) === null || _a === void 0 ? void 0 : _a.set({
                    // backgroundColor: '#FF000055',
                    // width: pathObj.width,
                    // height: pathObj.height,
                    // 移除新的路径大小引起的文本对象偏移
                    left: this.arcText.left + (newPathCenter.x - oldPathCenter.x),
                    top: this.arcText.top + (newPathCenter.y - oldPathCenter.y)
                }).setCoords();
                this.path = d;
            }
            /**
             * 添加新的路径指令
             */
            addPathPoint(x, y) {
                const pathObj = this.pathObj;
                // 如果之前没有路径，需要创建一个新的路径对象
                if (!pathObj) {
                    this.init({ x, y });
                    this.rebuild("init");
                    return;
                }
                const { translate } = this.transform;
                this.rebuild("add", (segmentsInfo) => {
                    // 新指令默认在路径最后
                    const insertIdx = segmentsInfo.length;
                    // 如果当前指令是闭合指令，则不添加新指令
                    if (segmentsInfo[insertIdx - 1][0] === "z")
                        return segmentsInfo;
                    const newPoint = [x - translate[0], y - translate[1]];
                    // 新创建指令默认是绘制直线
                    segmentsInfo.splice(insertIdx, 0, ["L", ...newPoint]);
                    // 新创建指令默认是绘制曲线
                    // const prePoint = segmentsInfo[insertIdx - 1] as number[];
                    // segmentsInfo.splice(insertIdx, 0, [
                    //   'C',
                    //   (prePoint[prePoint.length - 2] + newPoint[0]) / 2,
                    //   (prePoint[prePoint.length - 1] + newPoint[1]) / 2,
                    //   (prePoint[prePoint.length - 2] + newPoint[0]) / 2,
                    //   (prePoint[prePoint.length - 1] + newPoint[1]) / 2,
                    //   newPoint[0],
                    //   newPoint[1]
                    // ] as any);
                    return segmentsInfo;
                });
            }
            /**
             * 升级路径，插入操作点
             */
            insertPathPoint(pathIndex, pointIdx, x, y) {
                const { translate } = this.transform;
                this.rebuild("add", (segmentsInfo) => {
                    const newPoint = [x - translate[0], y - translate[1]];
                    const targetPath = segmentsInfo[pathIndex];
                    targetPath[0] = {
                        L: "Q",
                        Q: "C"
                    }[targetPath[0]];
                    targetPath.splice(pointIdx, 0, ...newPoint);
                    return segmentsInfo;
                });
            }
            /**
             * 闭合路径
             */
            closePath() {
                this.rebuild("add", (segmentsInfo) => {
                    // const firstPoint = segmentsInfo[0];
                    var _a;
                    const isClosure = ((_a = segmentsInfo[segmentsInfo.length - 1]) === null || _a === void 0 ? void 0 : _a[0].toUpperCase()) === "Z";
                    if (!isClosure)
                        segmentsInfo.push(["z"]);
                    return segmentsInfo;
                });
            }
            /**
             * 重新构建操作元素（操作点+参考线）
             *
             * 没有添加新指令的构建都优先复用旧的元素对象以提高性能，
             * 但出现指令增删的情况，就要求重新重新构建了
             */
            rebuildOperationElements(reuse = false) {
                if (!this.isEditing)
                    return;
                const canvas = this.canvas;
                const pathObj = this.pathObj;
                const { translate } = this.transform;
                // 删除之前的指令
                canvas.remove(...this.lines, ...this.points);
                // 记录新的操作点和参考线
                const newPoints = [];
                const newLines = [];
                // 记录上一个点用于贝塞尔曲线的参考线创建
                let prePoint;
                // 修改路径样式
                pathObj.set({ stroke: "#4b4b4b" });
                const path = pathObj.path;
                path === null || path === void 0 ? void 0 : path.forEach((item, pathIdx) => {
                    var _a, _b;
                    const [type, ...croods] = item;
                    // 创建操作点
                    for (let i = 0; i < croods.length; i += 2) {
                        // 是否关键点，即在路径上的点
                        const isMajor = i === croods.length - 2;
                        // 创建操作点
                        const point = (_a = (reuse ? this.points.pop() : undefined)) !== null && _a !== void 0 ? _a : new fabric.fabric.Circle({
                            strokeWidth: 4,
                            radius: 6,
                            fill: "#ffffff",
                            stroke: "#4b4b4b",
                            originX: "center",
                            originY: "center"
                        });
                        point.set({
                            left: path[pathIdx][i + 1] + translate[0],
                            top: path[pathIdx][i + 2] + translate[1]
                        });
                        point.on("mouseover", () => {
                            point.set({ fill: "#7ef4ad" });
                            canvas.renderAll();
                        });
                        point.on("mouseout", () => {
                            point.set({
                                fill: canvas.getActiveObject() === point ? "#29ca6e" : "#ffffff"
                            });
                            canvas.renderAll();
                        });
                        point.on("selected", () => {
                            point.set({ fill: "#29ca6e" });
                            // 如果是主要路径指令添加升级触发点
                            if (isMajor)
                                this.addPointTriggers(point);
                            canvas.renderAll();
                        });
                        point.on("deselected", () => {
                            point.set({ fill: "#ffffff" });
                            if (point.preTrigger)
                                canvas.remove(point.preTrigger);
                            if (point.nextTrigger)
                                canvas.remove(point.nextTrigger);
                            canvas.renderAll();
                        });
                        point.hasBorders = point.hasControls = false;
                        point.instructionType = type;
                        point.instructionIdx = pathIdx;
                        point.pointIdx = i + 1;
                        point.closure = ((_b = path[pathIdx + 1]) === null || _b === void 0 ? void 0 : _b[0].toUpperCase()) === "Z";
                        // 非关键点降低透明度
                        if (!isMajor)
                            point.set({ opacity: 0.2 });
                        // 如果是贝塞尔曲线则添加参考线
                        if (type === "Q" || type === "C") {
                            let line = reuse ? this.lines.pop() : undefined;
                            if (!line)
                                line = new fabric.fabric.Line([0, 0, 0, 0], {
                                    stroke: "#bebebe",
                                    strokeWidth: 1,
                                    strokeDashArray: [3, 4],
                                    selectable: false,
                                    evented: false
                                });
                            line.set({
                                x1: prePoint.left,
                                y1: prePoint.top,
                                x2: point.left,
                                y2: point.top
                            });
                            prePoint.nextLine = line;
                            point.preLine = line;
                            point.nextLine = undefined;
                            newLines.push(line);
                        }
                        prePoint = point;
                        newPoints.push(point);
                    }
                });
                // 文本禁用选中
                this.arcText.set({
                    selectable: false,
                    hasBorders: false,
                    hasControls: false
                }).setCoords();
                // 添加新的操作点和参考线
                this.points = newPoints;
                this.lines = newLines;
                canvas.add(...this.lines, ...this.points);
            }
            /**
             * 添加升级触点
             */
            addPointTriggers(point) {
                var _a, _b, _c;
                const canvas = this.canvas;
                const pathObj = this.pathObj;
                // 前一节路径
                const preChildPath = (_a = pathObj.path) === null || _a === void 0 ? void 0 : _a[point.instructionIdx - 1];
                // 后一节路径
                const nextChildPath = (_b = pathObj.path) === null || _b === void 0 ? void 0 : _b[point.instructionIdx + 1];
                // 同节路径前一个操作点的左偏移
                const prePointLeft = (_c = pathObj.path) === null || _c === void 0 ? void 0 : _c[point.instructionIdx][point.pointIdx - 2];
                // 创建升级触发点
                const createTrigger = (options) => {
                    const { left, top, onTrigger } = options;
                    const trigger = new fabric.fabric.Circle({
                        left,
                        top,
                        radius: 5,
                        fill: "#bebebe",
                        originX: "center",
                        originY: "center"
                    });
                    trigger.fromPoint = point;
                    trigger.on("mousedown", ({ e }) => {
                        onTrigger(e);
                    });
                    trigger.on("mouseover", () => {
                        trigger.set({
                            strokeWidth: 4,
                            radius: 4,
                            fill: "#ffffff",
                            stroke: "#4b4b4b"
                        });
                        canvas.renderAll();
                    });
                    trigger.on("mouseout", () => {
                        trigger.set({
                            strokeWidth: 0,
                            radius: 5,
                            fill: "#bebebe",
                            stroke: "transparent"
                        });
                        canvas.renderAll();
                    });
                    return trigger;
                };
                // 当是直线、二阶曲线最后一个指令时拥有前指令升级触发点
                if (["L", "Q"].includes(point.instructionType)) {
                    let left = point.left;
                    // 先根据同节路径前一个操作点的相对位置决定偏移方向
                    if (prePointLeft !== undefined) {
                        left = prePointLeft > point.left ? left + 20 : left - 20;
                    }
                    // 再判断前一节路径的最后操作点位置
                    else if (preChildPath) {
                        left =
                            preChildPath[preChildPath.length - 2] > point.left
                                ? left + 20
                                : left - 20;
                    }
                    // 如果都没有则默认向左偏移20像素
                    else {
                        left -= 20;
                    }
                    point.preTrigger = createTrigger({
                        left,
                        top: point.top,
                        onTrigger: (e) => {
                            this.insertPathPoint(point.instructionIdx, point.pointIdx, e.offsetX, e.offsetY);
                        }
                    });
                    canvas.add(point.preTrigger);
                }
                // 当后面的路径是直线、二阶曲线拥有后指令升级触发点
                if (["L", "Q"].includes(nextChildPath === null || nextChildPath === void 0 ? void 0 : nextChildPath[0])) {
                    point.nextTrigger = createTrigger({
                        left: point.left + (nextChildPath[1] > point.left ? 20 : -20),
                        top: point.top,
                        onTrigger: (e) => {
                            this.insertPathPoint(point.instructionIdx + 1, 1, e.offsetX, e.offsetY);
                        }
                    });
                    canvas.add(point.nextTrigger);
                }
            }
            /**
             * 清除所有操作元素
             */
            clearOperationElements() {
                const canvas = this.canvas;
                // 删除之前的指令
                canvas.remove(...this.lines, ...this.points);
                this.lines = [];
                this.points = [];
            }
            /**
             * 删除单个编辑点
             */
            handleRemovePoint(point) {
                const { instructionType, pointIdx, instructionIdx } = point;
                // 不允许删除起始点
                if (instructionType === "M" && instructionIdx === 0) {
                    return;
                }
                this.rebuild("delete", (segmentsInfo) => {
                    var _a;
                    // 移除一节路径最后一个关键指令，会导致整节被删除
                    if (pointIdx === segmentsInfo[instructionIdx].length - 2) {
                        // 特殊情况，如果当前路径闭合，且删除最后一个点，则删除闭合点
                        if (((_a = segmentsInfo[instructionIdx + 1]) === null || _a === void 0 ? void 0 : _a[0].toUpperCase()) === "Z") {
                            segmentsInfo.splice(instructionIdx + 1, 1);
                            return segmentsInfo;
                        }
                        segmentsInfo.splice(instructionIdx, 1);
                    }
                    // 移除一节路径中的次要指令，会导致该节路径降级
                    else {
                        segmentsInfo[instructionIdx][0] = {
                            Q: "L",
                            C: "Q"
                        }[instructionType];
                        segmentsInfo[instructionIdx].splice(pointIdx, 2);
                    }
                    return segmentsInfo;
                });
            }
            /**
             * 处理画布元素移动
             */
            handleMoveCanvas({ target }) {
                // 不是操作点直接跳出
                if (!this.points.includes(target))
                    return;
                const { translate } = this.transform;
                const { left = 0, top = 0, instructionIdx, pointIdx, preLine, nextLine, preTrigger, nextTrigger } = target;
                this.rebuild("update", (segmentsInfo) => {
                    segmentsInfo[instructionIdx][pointIdx] = left - translate[0];
                    segmentsInfo[instructionIdx][pointIdx + 1] = top - translate[1];
                    return segmentsInfo;
                });
                if (preLine)
                    preLine.set({ x2: left, y2: top });
                if (nextLine)
                    nextLine.set({ x1: left, y1: top });
                if (preTrigger)
                    preTrigger.set({ left: left - 20, top }).setCoords();
                if (nextTrigger)
                    nextTrigger.set({ left: left + 20, top }).setCoords();
            }
            /**
             * 销毁
             */
            destroy() {
                var _a;
                (_a = this.canvas) === null || _a === void 0 ? void 0 : _a.dispose();
                // 移除浏览器事件
                this._windowListeners.forEach(({ type, handler }) => {
                    window.removeEventListener(type, handler);
                });
                // 数据重置
                this.$el = null;
                this.canvas = null;
                this.pathObj = null;
                this.arcText = null;
                this.points = [];
                this.lines = [];
                this.transform = JSON.parse(JSON.stringify(DEFAULT_TRANSFORM));
                this.isEditing = false;
                this.isWaitForAdd = false;
                this._windowListeners = [];
            }
        }
        const editor = new ArcTextEditor(document.getElementById("canvas"), {
            width: 500,
            height: 400
        });
        editor.d("M 20 30 Q 100 -20 180 30");
        editor.write("Hello World!");
        editor.enterEditing();
        const input = document.querySelector("#input");
        const textarea = document.querySelector("#path");
        // 监听刻字内容更改
        input.oninput = (e) => {
            editor.write(e.target.value);
        };
        // 监听路径更改
        textarea.oninput = (e) => {
            editor.d(e.target.value);
        };
    };

    fabricPathEditor();

})(fabric);
