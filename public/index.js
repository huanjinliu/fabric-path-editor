!function(t,e){t&&!t.getElementById("livereloadscript")&&((e=t.createElement("script")).async=1,e.src="//"+(self.location.host||"localhost").split(":")[0]+":35729/livereload.js?snipver=1",e.id="livereloadscript",t.getElementsByTagName("head")[0].appendChild(e))}(self.document),function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e(require("fabric")):"function"==typeof define&&define.amd?define(["fabric"],e):(t="undefined"!=typeof globalThis?globalThis:t||self).FabricPathEditor=e(t.fabric)}(this,(function(t){"use strict";function e(t,e){return t===e||t!=t&&e!=e}function r(t,r){for(var n=t.length;n--;)if(e(t[n][0],r))return n;return-1}var n=Array.prototype.splice;function o(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}o.prototype.clear=function(){this.__data__=[],this.size=0},o.prototype.delete=function(t){var e=this.__data__,o=r(e,t);return!(o<0)&&(o==e.length-1?e.pop():n.call(e,o,1),--this.size,!0)},o.prototype.get=function(t){var e=this.__data__,n=r(e,t);return n<0?void 0:e[n][1]},o.prototype.has=function(t){return r(this.__data__,t)>-1},o.prototype.set=function(t,e){var n=this.__data__,o=r(n,t);return o<0?(++this.size,n.push([t,e])):n[o][1]=e,this};var i="object"==typeof global&&global&&global.Object===Object&&global,a="object"==typeof self&&self&&self.Object===Object&&self,c=i||a||Function("return this")(),s=c.Symbol,l=Object.prototype,u=l.hasOwnProperty,f=l.toString,p=s?s.toStringTag:void 0;var h=Object.prototype.toString;var v="[object Null]",b="[object Undefined]",d=s?s.toStringTag:void 0;function y(t){return null==t?void 0===t?b:v:d&&d in Object(t)?function(t){var e=u.call(t,p),r=t[p];try{t[p]=void 0;var n=!0}catch(t){}var o=f.call(t);return n&&(e?t[p]=r:delete t[p]),o}(t):function(t){return h.call(t)}(t)}function _(t){var e=typeof t;return null!=t&&("object"==e||"function"==e)}var g="[object AsyncFunction]",j="[object Function]",m="[object GeneratorFunction]",O="[object Proxy]";function x(t){if(!_(t))return!1;var e=y(t);return e==j||e==m||e==g||e==O}var w,A=c["__core-js_shared__"],P=(w=/[^.]+$/.exec(A&&A.keys&&A.keys.IE_PROTO||""))?"Symbol(src)_1."+w:"";var S=Function.prototype.toString;function E(t){if(null!=t){try{return S.call(t)}catch(t){}try{return t+""}catch(t){}}return""}var I=/^\[object .+?Constructor\]$/,T=Function.prototype,C=Object.prototype,M=T.toString,U=C.hasOwnProperty,R=RegExp("^"+M.call(U).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");function k(t){return!(!_(t)||(e=t,P&&P in e))&&(x(t)?R:I).test(E(t));var e}function z(t,e){var r=function(t,e){return null==t?void 0:t[e]}(t,e);return k(r)?r:void 0}var B=z(c,"Map"),L=z(Object,"create");var V=Object.prototype.hasOwnProperty;var N=Object.prototype.hasOwnProperty;function H(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}function F(t,e){var r,n,o=t.__data__;return("string"==(n=typeof(r=e))||"number"==n||"symbol"==n||"boolean"==n?"__proto__"!==r:null===r)?o["string"==typeof e?"string":"hash"]:o.map}function D(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}H.prototype.clear=function(){this.__data__=L?L(null):{},this.size=0},H.prototype.delete=function(t){var e=this.has(t)&&delete this.__data__[t];return this.size-=e?1:0,e},H.prototype.get=function(t){var e=this.__data__;if(L){var r=e[t];return"__lodash_hash_undefined__"===r?void 0:r}return V.call(e,t)?e[t]:void 0},H.prototype.has=function(t){var e=this.__data__;return L?void 0!==e[t]:N.call(e,t)},H.prototype.set=function(t,e){var r=this.__data__;return this.size+=this.has(t)?0:1,r[t]=L&&void 0===e?"__lodash_hash_undefined__":e,this},D.prototype.clear=function(){this.size=0,this.__data__={hash:new H,map:new(B||o),string:new H}},D.prototype.delete=function(t){var e=F(this,t).delete(t);return this.size-=e?1:0,e},D.prototype.get=function(t){return F(this,t).get(t)},D.prototype.has=function(t){return F(this,t).has(t)},D.prototype.set=function(t,e){var r=F(this,t),n=r.size;return r.set(t,e),this.size+=r.size==n?0:1,this};function $(t){var e=this.__data__=new o(t);this.size=e.size}$.prototype.clear=function(){this.__data__=new o,this.size=0},$.prototype.delete=function(t){var e=this.__data__,r=e.delete(t);return this.size=e.size,r},$.prototype.get=function(t){return this.__data__.get(t)},$.prototype.has=function(t){return this.__data__.has(t)},$.prototype.set=function(t,e){var r=this.__data__;if(r instanceof o){var n=r.__data__;if(!B||n.length<199)return n.push([t,e]),this.size=++r.size,this;r=this.__data__=new D(n)}return r.set(t,e),this.size=r.size,this};var W=function(){try{var t=z(Object,"defineProperty");return t({},"",{}),t}catch(t){}}();function X(t,e,r){"__proto__"==e&&W?W(t,e,{configurable:!0,enumerable:!0,value:r,writable:!0}):t[e]=r}var Y=Object.prototype.hasOwnProperty;function G(t,r,n){var o=t[r];Y.call(t,r)&&e(o,n)&&(void 0!==n||r in t)||X(t,r,n)}function Q(t,e,r,n){var o=!r;r||(r={});for(var i=-1,a=e.length;++i<a;){var c=e[i],s=n?n(r[c],t[c],c,r,t):void 0;void 0===s&&(s=t[c]),o?X(r,c,s):G(r,c,s)}return r}function q(t){return null!=t&&"object"==typeof t}function J(t){return q(t)&&"[object Arguments]"==y(t)}var K=Object.prototype,Z=K.hasOwnProperty,tt=K.propertyIsEnumerable,et=J(function(){return arguments}())?J:function(t){return q(t)&&Z.call(t,"callee")&&!tt.call(t,"callee")},rt=Array.isArray;var nt="object"==typeof exports&&exports&&!exports.nodeType&&exports,ot=nt&&"object"==typeof module&&module&&!module.nodeType&&module,it=ot&&ot.exports===nt?c.Buffer:void 0,at=(it?it.isBuffer:void 0)||function(){return!1},ct=9007199254740991,st=/^(?:0|[1-9]\d*)$/;function lt(t,e){var r=typeof t;return!!(e=null==e?ct:e)&&("number"==r||"symbol"!=r&&st.test(t))&&t>-1&&t%1==0&&t<e}var ut=9007199254740991;function ft(t){return"number"==typeof t&&t>-1&&t%1==0&&t<=ut}var pt={};function ht(t){return function(e){return t(e)}}pt["[object Float32Array]"]=pt["[object Float64Array]"]=pt["[object Int8Array]"]=pt["[object Int16Array]"]=pt["[object Int32Array]"]=pt["[object Uint8Array]"]=pt["[object Uint8ClampedArray]"]=pt["[object Uint16Array]"]=pt["[object Uint32Array]"]=!0,pt["[object Arguments]"]=pt["[object Array]"]=pt["[object ArrayBuffer]"]=pt["[object Boolean]"]=pt["[object DataView]"]=pt["[object Date]"]=pt["[object Error]"]=pt["[object Function]"]=pt["[object Map]"]=pt["[object Number]"]=pt["[object Object]"]=pt["[object RegExp]"]=pt["[object Set]"]=pt["[object String]"]=pt["[object WeakMap]"]=!1;var vt="object"==typeof exports&&exports&&!exports.nodeType&&exports,bt=vt&&"object"==typeof module&&module&&!module.nodeType&&module,dt=bt&&bt.exports===vt&&i.process,yt=function(){try{var t=bt&&bt.require&&bt.require("util").types;return t||dt&&dt.binding&&dt.binding("util")}catch(t){}}(),_t=yt&&yt.isTypedArray,gt=_t?ht(_t):function(t){return q(t)&&ft(t.length)&&!!pt[y(t)]},jt=Object.prototype.hasOwnProperty;function mt(t,e){var r=rt(t),n=!r&&et(t),o=!r&&!n&&at(t),i=!r&&!n&&!o&&gt(t),a=r||n||o||i,c=a?function(t,e){for(var r=-1,n=Array(t);++r<t;)n[r]=e(r);return n}(t.length,String):[],s=c.length;for(var l in t)!e&&!jt.call(t,l)||a&&("length"==l||o&&("offset"==l||"parent"==l)||i&&("buffer"==l||"byteLength"==l||"byteOffset"==l)||lt(l,s))||c.push(l);return c}var Ot=Object.prototype;function xt(t){var e=t&&t.constructor;return t===("function"==typeof e&&e.prototype||Ot)}function wt(t,e){return function(r){return t(e(r))}}var At=wt(Object.keys,Object),Pt=Object.prototype.hasOwnProperty;function St(t){return null!=t&&ft(t.length)&&!x(t)}function Et(t){return St(t)?mt(t):function(t){if(!xt(t))return At(t);var e=[];for(var r in Object(t))Pt.call(t,r)&&"constructor"!=r&&e.push(r);return e}(t)}var It=Object.prototype.hasOwnProperty;function Tt(t){if(!_(t))return function(t){var e=[];if(null!=t)for(var r in Object(t))e.push(r);return e}(t);var e=xt(t),r=[];for(var n in t)("constructor"!=n||!e&&It.call(t,n))&&r.push(n);return r}function Ct(t){return St(t)?mt(t,!0):Tt(t)}var Mt="object"==typeof exports&&exports&&!exports.nodeType&&exports,Ut=Mt&&"object"==typeof module&&module&&!module.nodeType&&module,Rt=Ut&&Ut.exports===Mt?c.Buffer:void 0,kt=Rt?Rt.allocUnsafe:void 0;function zt(){return[]}var Bt=Object.prototype.propertyIsEnumerable,Lt=Object.getOwnPropertySymbols,Vt=Lt?function(t){return null==t?[]:(t=Object(t),function(t,e){for(var r=-1,n=null==t?0:t.length,o=0,i=[];++r<n;){var a=t[r];e(a,r,t)&&(i[o++]=a)}return i}(Lt(t),(function(e){return Bt.call(t,e)})))}:zt;function Nt(t,e){for(var r=-1,n=e.length,o=t.length;++r<n;)t[o+r]=e[r];return t}var Ht=wt(Object.getPrototypeOf,Object),Ft=Object.getOwnPropertySymbols?function(t){for(var e=[];t;)Nt(e,Vt(t)),t=Ht(t);return e}:zt;function Dt(t,e,r){var n=e(t);return rt(t)?n:Nt(n,r(t))}function $t(t){return Dt(t,Et,Vt)}function Wt(t){return Dt(t,Ct,Ft)}var Xt=z(c,"DataView"),Yt=z(c,"Promise"),Gt=z(c,"Set"),Qt=z(c,"WeakMap"),qt="[object Map]",Jt="[object Promise]",Kt="[object Set]",Zt="[object WeakMap]",te="[object DataView]",ee=E(Xt),re=E(B),ne=E(Yt),oe=E(Gt),ie=E(Qt),ae=y;(Xt&&ae(new Xt(new ArrayBuffer(1)))!=te||B&&ae(new B)!=qt||Yt&&ae(Yt.resolve())!=Jt||Gt&&ae(new Gt)!=Kt||Qt&&ae(new Qt)!=Zt)&&(ae=function(t){var e=y(t),r="[object Object]"==e?t.constructor:void 0,n=r?E(r):"";if(n)switch(n){case ee:return te;case re:return qt;case ne:return Jt;case oe:return Kt;case ie:return Zt}return e});var ce=ae,se=Object.prototype.hasOwnProperty;var le=c.Uint8Array;function ue(t){var e=new t.constructor(t.byteLength);return new le(e).set(new le(t)),e}var fe=/\w*$/;var pe=s?s.prototype:void 0,he=pe?pe.valueOf:void 0;var ve="[object Boolean]",be="[object Date]",de="[object Map]",ye="[object Number]",_e="[object RegExp]",ge="[object Set]",je="[object String]",me="[object Symbol]",Oe="[object ArrayBuffer]",xe="[object DataView]",we="[object Float32Array]",Ae="[object Float64Array]",Pe="[object Int8Array]",Se="[object Int16Array]",Ee="[object Int32Array]",Ie="[object Uint8Array]",Te="[object Uint8ClampedArray]",Ce="[object Uint16Array]",Me="[object Uint32Array]";function Ue(t,e,r){var n,o,i,a=t.constructor;switch(e){case Oe:return ue(t);case ve:case be:return new a(+t);case xe:return function(t,e){var r=e?ue(t.buffer):t.buffer;return new t.constructor(r,t.byteOffset,t.byteLength)}(t,r);case we:case Ae:case Pe:case Se:case Ee:case Ie:case Te:case Ce:case Me:return function(t,e){var r=e?ue(t.buffer):t.buffer;return new t.constructor(r,t.byteOffset,t.length)}(t,r);case de:return new a;case ye:case je:return new a(t);case _e:return(i=new(o=t).constructor(o.source,fe.exec(o))).lastIndex=o.lastIndex,i;case ge:return new a;case me:return n=t,he?Object(he.call(n)):{}}}var Re=Object.create,ke=function(){function t(){}return function(e){if(!_(e))return{};if(Re)return Re(e);t.prototype=e;var r=new t;return t.prototype=void 0,r}}();var ze=yt&&yt.isMap,Be=ze?ht(ze):function(t){return q(t)&&"[object Map]"==ce(t)};var Le=yt&&yt.isSet,Ve=Le?ht(Le):function(t){return q(t)&&"[object Set]"==ce(t)},Ne=1,He=2,Fe=4,De="[object Arguments]",$e="[object Function]",We="[object GeneratorFunction]",Xe="[object Object]",Ye={};function Ge(t,e,r,n,o,i){var a,c=e&Ne,s=e&He,l=e&Fe;if(r&&(a=o?r(t,n,o,i):r(t)),void 0!==a)return a;if(!_(t))return t;var u=rt(t);if(u){if(a=function(t){var e=t.length,r=new t.constructor(e);return e&&"string"==typeof t[0]&&se.call(t,"index")&&(r.index=t.index,r.input=t.input),r}(t),!c)return function(t,e){var r=-1,n=t.length;for(e||(e=Array(n));++r<n;)e[r]=t[r];return e}(t,a)}else{var f=ce(t),p=f==$e||f==We;if(at(t))return function(t,e){if(e)return t.slice();var r=t.length,n=kt?kt(r):new t.constructor(r);return t.copy(n),n}(t,c);if(f==Xe||f==De||p&&!o){if(a=s||p?{}:function(t){return"function"!=typeof t.constructor||xt(t)?{}:ke(Ht(t))}(t),!c)return s?function(t,e){return Q(t,Ft(t),e)}(t,function(t,e){return t&&Q(e,Ct(e),t)}(a,t)):function(t,e){return Q(t,Vt(t),e)}(t,function(t,e){return t&&Q(e,Et(e),t)}(a,t))}else{if(!Ye[f])return o?t:{};a=Ue(t,f,c)}}i||(i=new $);var h=i.get(t);if(h)return h;i.set(t,a),Ve(t)?t.forEach((function(n){a.add(Ge(n,e,r,n,t,i))})):Be(t)&&t.forEach((function(n,o){a.set(o,Ge(n,e,r,o,t,i))}));var v=u?void 0:(l?s?Wt:$t:s?Ct:Et)(t);return function(t,e){for(var r=-1,n=null==t?0:t.length;++r<n&&!1!==e(t[r],r,t););}(v||t,(function(n,o){v&&(n=t[o=n]),G(a,o,Ge(n,e,r,o,t,i))})),a}Ye[De]=Ye["[object Array]"]=Ye["[object ArrayBuffer]"]=Ye["[object DataView]"]=Ye["[object Boolean]"]=Ye["[object Date]"]=Ye["[object Float32Array]"]=Ye["[object Float64Array]"]=Ye["[object Int8Array]"]=Ye["[object Int16Array]"]=Ye["[object Int32Array]"]=Ye["[object Map]"]=Ye["[object Number]"]=Ye[Xe]=Ye["[object RegExp]"]=Ye["[object Set]"]=Ye["[object String]"]=Ye["[object Symbol]"]=Ye["[object Uint8Array]"]=Ye["[object Uint8ClampedArray]"]=Ye["[object Uint16Array]"]=Ye["[object Uint32Array]"]=!0,Ye["[object Error]"]=Ye[$e]=Ye["[object WeakMap]"]=!1;function Qe(t){return t}var qe=Math.max;var Je=W?function(t,e){return W(t,"toString",{configurable:!0,enumerable:!1,value:(r=e,function(){return r}),writable:!0});var r}:Qe,Ke=Je,Ze=Date.now;var tr,er,rr,nr=(tr=Ke,er=0,rr=0,function(){var t=Ze(),e=16-(t-rr);if(rr=t,e>0){if(++er>=800)return arguments[0]}else er=0;return tr.apply(void 0,arguments)});var or=Object.prototype,ir=or.hasOwnProperty,ar=function(t,e){return nr(function(t,e,r){return e=qe(void 0===e?t.length-1:e,0),function(){for(var n=arguments,o=-1,i=qe(n.length-e,0),a=Array(i);++o<i;)a[o]=n[e+o];o=-1;for(var c=Array(e+1);++o<e;)c[o]=n[o];return c[e]=r(a),function(t,e,r){switch(r.length){case 0:return t.call(e);case 1:return t.call(e,r[0]);case 2:return t.call(e,r[0],r[1]);case 3:return t.call(e,r[0],r[1],r[2])}return t.apply(e,r)}(t,this,c)}}(t,e,Qe),t+"")}((function(t,r){t=Object(t);var n=-1,o=r.length,i=o>2?r[2]:void 0;for(i&&function(t,r,n){if(!_(n))return!1;var o=typeof r;return!!("number"==o?St(n)&&lt(r,n.length):"string"==o&&r in n)&&e(n[r],t)}(r[0],r[1],i)&&(o=1);++n<o;)for(var a=r[n],c=Ct(a),s=-1,l=c.length;++s<l;){var u=c[s],f=t[u];(void 0===f||e(f,or[u])&&!ir.call(t,u))&&(t[u]=a[u])}return t})),cr=/\s/;var sr=/^\s+/;function lr(t){return t?t.slice(0,function(t){for(var e=t.length;e--&&cr.test(t.charAt(e)););return e}(t)+1).replace(sr,""):t}var ur="[object Symbol]";function fr(t){return"symbol"==typeof t||q(t)&&y(t)==ur}var pr=NaN,hr=/^[-+]0x[0-9a-f]+$/i,vr=/^0b[01]+$/i,br=/^0o[0-7]+$/i,dr=parseInt;function yr(t){if("number"==typeof t)return t;if(fr(t))return pr;if(_(t)){var e="function"==typeof t.valueOf?t.valueOf():t;t=_(e)?e+"":e}if("string"!=typeof t)return 0===t?t:+t;t=lr(t);var r=vr.test(t);return r||br.test(t)?dr(t.slice(2),r?2:8):hr.test(t)?pr:+t}var _r=1/0,gr=17976931348623157e292;function jr(t){var e=function(t){return t?(t=yr(t))===_r||t===-_r?(t<0?-1:1)*gr:t==t?t:0:0===t?t:0}(t),r=e%1;return e==e?r?e-r:e:0}var mr=1/0,Or=s?s.prototype:void 0,xr=Or?Or.toString:void 0;function wr(t){if("string"==typeof t)return t;if(rt(t))return function(t,e){for(var r=-1,n=null==t?0:t.length,o=Array(n);++r<n;)o[r]=e(t[r],r,t);return o}(t,wr)+"";if(fr(t))return xr?xr.call(t):"";var e=t+"";return"0"==e&&1/t==-mr?"-0":e}function Ar(t){return null==t?"":wr(t)}var Pr=c.isFinite,Sr=Math.min;var Er=function(t){var e=Math[t];return function(t,r){if(t=yr(t),(r=null==r?0:Sr(jr(r),292))&&Pr(t)){var n=(Ar(t)+"e").split("e");return+((n=(Ar(e(n[0]+"e"+(+n[1]+r)))+"e").split("e"))[0]+"e"+(+n[1]-r))}return e(t)}}("round");const Ir=Symbol("fabric-path-editor-symbol"),Tr=Symbol("fabric-path-editor-controller-info");var Cr,Mr;!function(t){t.MAJOR_POINT="major-point",t.SUB_POINT="sub-point"}(Cr||(Cr={})),function(t){t.START="M",t.LINE="L",t.QUADRATIC_CURCE="Q",t.BEZIER_CURVE="C",t.CLOSE="z"}(Mr||(Mr={}));class Ur{constructor(t,e={}){this._options={},this.source=null,this.target=null,this.controllers={points:[]},this.listeners=[],this._inbuiltStatus={cancelHandlerMirrorMove:!1},this._storePlatformStatus=null,this._handleObjectsSelectEvent=(t,e)=>{const r=this._platform,{preHandler:n,nextHandler:o,activePoint:i}=this.controllers,a=t[0],c=t=>{if(!t)return;t.item(0).set({fill:"#ffffff"});const{preHandler:e,nextHandler:n}=this.controllers;e&&(r.remove(e.point),r.remove(e.line)),n&&(r.remove(n.point),r.remove(n.line))},s=t=>{t.item(0).set({fill:"#29ca6e"});const{cur:e,pre:n,next:o}=this._getPointAroundPoints(t),{preHandler:i,nextHandler:a}=this.controllers;let c=!0;[{target:i,mirrorTarget:a,instruction:n,hidden:!(null==n?void 0:n.point)||!e||e.instruction[0]===Mr.LINE},{target:a,mirrorTarget:i,instruction:o,hidden:!(null==o?void 0:o.point)||o.instruction[0]===Mr.LINE}].forEach((({target:e,mirrorTarget:n,instruction:o,hidden:i})=>{e&&(i?this._observe(e.point,(()=>{})):(null==o?void 0:o.point)&&(e.point[Tr].instruction=o.instruction,e.point[Tr].instructionValueIdx=o.instructionValueIdx,this._observe(e.point,(({left:r,top:i})=>{e.line.set({x1:t.left,y1:t.top,x2:e.point.left,y2:e.point.top}),o.instruction[o.instructionValueIdx]=r,o.instruction[o.instructionValueIdx+1]=i,this._inbuiltStatus.cancelHandlerMirrorMove?c=!1:c&&this.controllers.activeHandlerPoint&&n&&(n.point.set({left:2*t.left-e.point.left,top:2*t.top-e.point.top}),n.line.set({x1:t.left,y1:t.top,x2:n.point.left,y2:n.point.top}))})),e.point.set(this._withSourceTransform(o.point)),r.add(e.line,e.point)))})),c=void 0!==i&&void 0!==a&&i.point.left+a.point.left===2*t.left&&i.point.top+a.point.top===2*t.top,r.renderAll()},l=t=>{[n,o].find((e=>(null==e?void 0:e.point)===t)),this.controllers.activeHandlerPoint=t};(()=>{this.controllers.activeHandlerPoint=void 0})(),a?(a[Tr].type===Cr.MAJOR_POINT&&(c(i),s(a),this.controllers.activePoint=a),a[Tr].type===Cr.SUB_POINT&&l(a)):(c(i),this.controllers.activePoint=void 0),r.renderAll()},this._platform=t,this._options=ar(e,this._options)}observe(t){this.source=t}static transformPath(t,e,r=!0){const{translate:n,scale:o,rotate:i}=e,a=r?t.path:Ge(t.path,5);return null==a||a.forEach(((t,e)=>{const[,...r]=t;for(let t=0;t<r.length;t+=2){let r=a[e][t+1],c=a[e][t+2];void 0!==o&&(r*=o.x,c*=o.y),void 0!==i&&(r=Math.cos(i*Math.PI/180)*r-Math.sin(i*Math.PI/180)*c,c=Math.sin(i*Math.PI/180)*r+Math.cos(i*Math.PI/180)*c),void 0!==n&&(r+=n.x,c+=n.y),a[e][t+1]=r,a[e][t+2]=c}})),a}static initializePath(e,r,n=[1,0,0,1,0,0]){var o;const i=e.left,a=e.top;null===(o=e.path)||void 0===o||o.forEach((t=>{const[,...e]=t;for(let r=0;r<e.length;r+=2)t[r+1]=Er(t[r+1],3),t[r+2]=Er(t[r+2],3)}));const c=new t.fabric.Path(t.fabric.util.joinPath(e.path)).getCenterPoint();e.initialize(r);const s=new t.fabric.Path(r).getCenterPoint(),l=t.fabric.util.transformPoint(new t.fabric.Point(s.x-c.x,s.y-c.y),n);e.set({left:i+l.x,top:a+l.y}),e.setCoords()}_patchPath(e){if(!e.path)return;const r=e.path;Ur.transformPath(e,{translate:{x:-e.pathOffset.x,y:-e.pathOffset.y}});if(r[r.length-1][0]===Mr.CLOSE){const t=r[0].slice(r[0].length-2),e=r[r.length-2].slice(r[r.length-2].length-2);e[0]===t[0]&&e[1]===t[1]||r.splice(r.length-1,0,[Mr.LINE,t[0],t[1]])}e.pathOffset=new t.fabric.Point(0,0)}_initPlatformStatus(){var t;if(!this._platform)return;const e=this._platform;this._storePlatformStatus={canvasSelection:null!==(t=e.selection)&&void 0!==t&&t,objectSelections:new WeakMap(e._objects.map((t=>{var e;return[t,null===(e=t.selectable)||void 0===e||e]})))},e.selection=!1,e.preserveObjectStacking=!0,e.controlsAboveOverlay=!0,e.discardActiveObject(),e.forEachObject((t=>{t.set({selectable:!1})}))}_getPointInstructions(t){var e,r;const n=t[Tr].instruction,o=null===(e=this.target)||void 0===e?void 0:e.path;if(!o)return{cur:null,next:null,pre:null};const i=o.indexOf(n);let a=o[i-1],c=o[i+1];return(null===(r=o[o.length-1])||void 0===r?void 0:r[0])===Mr.CLOSE&&!a&&(a=o[o.length-2]),c&&c[0]===Mr.CLOSE&&(c=o[0]),{cur:n,pre:null!=a?a:null,next:null!=c?c:null}}_getPointAroundPoints(t){const{cur:e,pre:r,next:n}=this._getPointInstructions(t);if(!e)return{cur:null,pre:null,next:null};let o=null,i=null;switch(e[0]){case Mr.START:(null==r?void 0:r[0])===Mr.QUADRATIC_CURCE&&(o={instruction:r,instructionValueIdx:r.length-2,point:{x:r[r.length-2],y:r[r.length-1]}}),(null==r?void 0:r[0])===Mr.BEZIER_CURVE&&(o={instruction:r,instructionValueIdx:r.length-4,point:{x:r[r.length-4],y:r[r.length-3]}});break;case Mr.LINE:r&&(o={instruction:r,instructionValueIdx:r.length-2,point:{x:r[r.length-2],y:r[r.length-1]}});break;case Mr.QUADRATIC_CURCE:o={instruction:e,instructionValueIdx:1,point:{x:e[1],y:e[2]}};break;case Mr.BEZIER_CURVE:o={instruction:e,instructionValueIdx:3,point:{x:e[3],y:e[4]}};case Mr.CLOSE:}return n&&n[0]!==Mr.CLOSE&&(i={instruction:n,instructionValueIdx:1,point:{x:n[1],y:n[2]}}),{cur:{instruction:e,instructionValueIdx:e.length-2,point:{x:e[e.length-2],y:e[e.length-1]}},pre:o,next:i}}_withSourceTransform(e){const r=t.fabric.util.transformPoint(new t.fabric.Point(e.x,e.y),this.source.calcOwnMatrix());return{left:r.x,top:r.y}}_invertSourceTransform(e){const r=t.fabric.util.transformPoint(new t.fabric.Point(e.x,e.y),t.fabric.util.invertTransform(this.source.calcOwnMatrix()));return{left:r.x,top:r.y}}_initPathControlPoints(){const e=this._platform,r=this.target;if(!e||!r)return;const n=[],o=r.path;null==o||o.forEach(((e,r)=>{var i;const a=e;if(a[0]===Mr.CLOSE)return;if((null===(i=o[r+1])||void 0===i?void 0:i[0])===Mr.CLOSE)return;const[c,s]=a.slice(a.length-2),l=new t.fabric.Group([new t.fabric.Circle({strokeWidth:4,radius:6,fill:"#ffffff",stroke:"#4b4b4b",originX:"center",originY:"center"})],{originX:"center",originY:"center",hasBorders:!1,hasControls:!1});l[Ir]=!0,l[Tr]={type:Cr.MAJOR_POINT,instruction:a,instructionValueIdx:a.length-2},this._observe(l,(({left:t,top:e})=>{const{pre:r}=this._getPointInstructions(l),{preHandler:n,nextHandler:o}=this.controllers,i=t-a[a.length-2],c=e-a[a.length-1];n&&n.point.set({left:n.point.left+i,top:n.point.top+c}),o&&o.point.set({left:o.point.left+i,top:o.point.top+c}),a[a.length-2]=t,a[a.length-1]=e,a[0]===Mr.START&&r&&(r[r.length-2]=t),a[0]===Mr.START&&r&&(r[r.length-1]=e)})),l.set(this._withSourceTransform({x:c,y:s})),n.push(l)})),e.add(...n),this.controllers.points=n}_initPathControlHandlers(){return["pre","next"].forEach((e=>{const r=new t.fabric.Group([new t.fabric.Circle({radius:5,fill:"#bebebe",originX:"center",originY:"center"})],{originX:"center",originY:"center",hasBorders:!1,hasControls:!1});r[Ir]=!0,r[Tr]={type:Cr.SUB_POINT};const n=new t.fabric.Line([0,0,0,0],{stroke:"#bebebe",strokeWidth:1,strokeDashArray:[4,3],strokeUniform:!0,selectable:!1,evented:!1,originX:"center",originY:"center"});this.controllers[`${e}Handler`]={point:r,line:n}})),this.controllers}_observe(t,e){var r,n;let o=null!==(r=t.left)&&void 0!==r?r:0,i=null!==(n=t.top)&&void 0!==n?n:0;Object.defineProperties(t,{left:{get:()=>o,set:t=>{if(o===t)return;const r={x:o,y:i};o=t,e(this._invertSourceTransform({x:o,y:i}),this._invertSourceTransform(r))}},top:{get:()=>i,set:t=>{if(i===t)return;const r={x:o,y:i};i=t,e(this._invertSourceTransform({x:o,y:i}),this._invertSourceTransform(r))}}})}_on(t,e,r){"global"===t&&window.addEventListener(e,r),"canvas"===t&&this._platform.on(e,r),this.listeners.push({type:t,eventName:e,handler:r})}_initEvents(){(()=>{this._on("canvas","selection:created",(t=>{this._handleObjectsSelectEvent(t.selected,[])})),this._on("canvas","selection:updated",(t=>{this._handleObjectsSelectEvent(t.selected,t.deselected)})),this._on("canvas","selection:cleared",(t=>{this._handleObjectsSelectEvent([],t.deselected)}))})(),(()=>{let t;const e=[{combinationKeys:["alt"],onActivate:()=>{this._inbuiltStatus.cancelHandlerMirrorMove=!0},onDeactivate:()=>{this._inbuiltStatus.cancelHandlerMirrorMove=!1}}],r=()=>{var e;t&&(null===(e=t.onDeactivate)||void 0===e||e.call(t),t=void 0)},n=n=>{let o=n.key.toLowerCase();e.forEach((e=>{var i;const{key:a,combinationKeys:c=[]}=e;(a||0!==c.length)&&("keyup"===n.type&&(o=""),a&&a!==o||c.some((t=>!n[`${t}Key`]))?"keyup"===n.type&&r():t!==e&&(null===(i=null==t?void 0:t.onDeactivate)||void 0===i||i.call(t),t=e,null==t||t.onActivate()))}))};this._on("global","keydown",n.bind(this)),this._on("global","keyup",n.bind(this)),this._on("global","blur",r)})()}async enterEditing(t){if(!this.source||"path"!==this.source.type)throw Error("Please observe target path before editing.");this._initPlatformStatus(),this.target=await new Promise((t=>this.source.clone(t))),this._patchPath(this.target),t&&t(this.target),this.target[Ir]=!0,this.target.set({selectable:!1,objectCaching:!1}),this._platform.add(this.target),this._platform.renderOnAddRemove=!1,this._initPathControlPoints(),this._initPathControlHandlers(),this._platform.renderOnAddRemove=!0,this._platform.renderAll(),this._initEvents(),this._platform.setActiveObject(this.controllers.points[6])}leaveEditing(){}destory(){}}return Ur}));