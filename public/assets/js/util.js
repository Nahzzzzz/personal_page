/* ============================================================
   共用小工具
   ============================================================
   文案全部写在 content-zh.js / content-en.js 里，页面只做一件事：
   按 HTML 上标记的点号路径取值，把值填进文本或属性。

   这个文件不依赖任何东西，必须在 content.js / render.js 之前加载。
   ============================================================ */

window.SiteUtil = (function () {
  "use strict";

  /* "about.facts" → 逐层取值，中间任何一层取不到就返回 undefined，
     调用方拿到 undefined 就知道这条标记写错了（或者两个语言包不同步）。 */
  function getPath(object, path) {
    if (object == null || !path) return undefined;

    var parts = String(path).split(".");
    var node = object;

    for (var i = 0; i < parts.length; i += 1) {
      if (node == null) return undefined;
      node = node[parts[i]];
    }

    return node;
  }

  return {
    getPath: getPath,
  };
})();
