/* ============================================================
   共用小工具：点号路径取值/赋值、深合并、逐层对比
   前台（content.js / render.js）和后台（/admin）都用这一份，
   保证两边对「覆盖」的理解完全一致。
   ============================================================ */

window.SiteUtil = (function () {
  "use strict";

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  /* 值的「种类」，用来判断覆盖方给的类型对不对 */
  function kindOf(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    return typeof value === "object" ? "object" : "scalar";
  }

  /* "about.facts" → 逐层取值，中间取不到就返回 undefined */
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

  function isArrayIndex(key) {
    return /^\d+$/.test(key);
  }

  /* 逐层赋值，中间缺的层级自动补上（下一层是数字就补数组，否则补对象）。
     必须区分这两种情况，否则往 skills.groups.0.items 写值时会
     把 groups 这个数组当成缺少的对象覆盖掉。 */
  function setPath(object, path, value) {
    var parts = String(path).split(".");
    var node = object;

    for (var i = 0; i < parts.length - 1; i += 1) {
      var key = parts[i];
      var child = node[key];

      if (child == null || typeof child !== "object") {
        node[key] = isArrayIndex(parts[i + 1]) ? [] : {};
      }

      node = node[key];
    }

    node[parts[parts.length - 1]] = value;
    return object;
  }

  /* 深合并，返回新对象，不修改任何入参。两条规则：

     1. 数组整体替换，不逐项合并 —— 列表的增删和顺序完全由覆盖方决定。
     2. 默认值已经存在的路径只接受「同类」覆盖。后台内容万一被写坏成别的类型
        （比如 hero 整块被存成一个字符串），这里会退回默认值，页面不会整块变空。

     第二条是给「后台数据不可信」兜底的：类型不对就当作没改过，而不是照着渲染。 */
  function deepMerge(base, override) {
    if (override === undefined) return clone(base);
    /* 默认值还没有这个键时原样接受，这样语言包可以慢慢补字段 */
    if (base === undefined || base === null) return clone(override);

    if (!isPlainObject(base)) {
      return kindOf(base) === kindOf(override) ? clone(override) : clone(base);
    }

    if (!isPlainObject(override)) return clone(base);

    var output = Object.assign({}, base);

    Object.keys(override).forEach(function (key) {
      output[key] = deepMerge(base[key], override[key]);
    });

    return output;
  }

  /* 走一遍 JSON 序列化，顺便挡掉 undefined 和函数这类不能存的值 */
  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  /* 逐层对比，列出两边不一样的所有路径。
     后台保存后用它校验 D1 里读回来的内容确实写进去了。 */
  function diffPaths(left, right) {
    var output = [];

    (function walk(a, b, prefix) {
      var keys = {};

      [a, b].forEach(function (source) {
        if (source && typeof source === "object") {
          Object.keys(source).forEach(function (key) {
            keys[key] = true;
          });
        }
      });

      Object.keys(keys).forEach(function (key) {
        var path = prefix ? prefix + "." + key : key;
        var leftValue = a == null ? undefined : a[key];
        var rightValue = b == null ? undefined : b[key];

        if (isPlainObject(leftValue) || isPlainObject(rightValue)) {
          walk(leftValue, rightValue, path);
          return;
        }

        if (JSON.stringify(leftValue) !== JSON.stringify(rightValue)) output.push(path);
      });
    })(left, right, "");

    return output;
  }

  /* 丢掉路径数组里被更长路径包含的项，只保留最浅的那层。
     保存补丁时用：`a.b` 已经在列表里，`a.b.0.c` 就没必要再发一遍。 */
  function shallowestPaths(paths) {
    var sorted = paths.slice().sort();
    var output = [];

    sorted.forEach(function (path) {
      var covered = output.some(function (kept) {
        return path === kept || path.indexOf(kept + ".") === 0;
      });
      if (!covered) output.push(path);
    });

    return output;
  }

  return {
    isPlainObject: isPlainObject,
    kindOf: kindOf,
    getPath: getPath,
    setPath: setPath,
    deepMerge: deepMerge,
    clone: clone,
    diffPaths: diffPaths,
    shallowestPaths: shallowestPaths,
  };
})();
