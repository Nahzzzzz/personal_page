/* ============================================================
   列表渲染：把内容里的数组渲染成页面结构
   ============================================================
   挂载点写在 HTML 上，用 data-list="projects.items" 标记，
   值就是内容里的点号路径。渲染器按这个键注册。

   内容来自后台，所以一律用 createElement + textContent 构建，
   不用 innerHTML —— 避免后台里写进 <script> 之类内容时被执行。
   ============================================================ */

window.SiteRender = (function () {
  "use strict";

  var util = window.SiteUtil;

  /* 项目缩略图有 6 套 CSS 渐变配色，按顺序循环使用 */
  var THUMB_VARIANTS = 6;

  var SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null && text !== "") node.textContent = String(text);
    return node;
  }

  function svgIcon(pathData, className) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", className || "icon icon--14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("d", pathData);

    svg.appendChild(path);
    return svg;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  /* 一组小标签，空数组返回 null，方便调用方用 if 判断要不要挂上去 */
  function pillList(items, modifier) {
    var values = asArray(items).filter(function (item) {
      return item != null && String(item).trim() !== "";
    });

    if (!values.length) return null;

    var list = el("ul", modifier ? "pills pills--" + modifier : "pills");
    values.forEach(function (value) {
      list.appendChild(el("li", "pill", value));
    });

    return list;
  }

  /* ---------------- 各列表的渲染器 ---------------- */

  var renderers = {
    /* about.paragraphs → 一组 <p> */
    "about.paragraphs": function (node, paragraphs) {
      asArray(paragraphs).forEach(function (text) {
        if (text) node.appendChild(el("p", null, text));
      });
    },

    /* about.facts → 一行一个键值对，dl 里用 div 分组是合法的 */
    "about.facts": function (node, facts) {
      asArray(facts).forEach(function (fact) {
        if (!fact) return;

        var row = el("div", "facts__row");
        row.appendChild(el("dt", null, fact.label));
        row.appendChild(el("dd", null, fact.value));
        node.appendChild(row);
      });
    },

    /* skills.groups → 小标题 + 标签组 */
    "skills.groups": function (node, groups) {
      asArray(groups).forEach(function (group) {
        if (!group) return;

        var wrap = el("div", "skills__group");
        wrap.appendChild(el("h3", "skills__group-title", group.title));

        var pills = pillList(group.items);
        if (pills) wrap.appendChild(pills);

        node.appendChild(wrap);
      });
    },

    /* projects.items → 卡片网格 */
    "projects.items": function (node, items, content) {
      var labels = (content && content.projects) || {};

      asArray(items).forEach(function (item, index) {
        if (!item) return;

        var card = el("article", "card");

        var thumbnail = el("div", "card__thumb card__thumb--" + ((index % THUMB_VARIANTS) + 1));
        thumbnail.setAttribute("aria-hidden", "true");
        thumbnail.appendChild(el("span", null, item.title));
        card.appendChild(thumbnail);

        var body = el("div", "card__body");
        body.appendChild(el("h3", "card__title", item.title));
        body.appendChild(el("p", "card__desc", item.desc));

        var pills = pillList(item.stack, "sm");
        if (pills) body.appendChild(pills);

        var links = el("div", "card__links");

        [
          { href: item.demo, label: labels.demoLabel },
          { href: item.code, label: labels.codeLabel },
        ].forEach(function (entry) {
          /* 没填链接就不渲染这个入口，避免出现指向 "#" 的死链 */
          if (!entry.href) return;

          var link = el("a", "card__link");
          link.href = entry.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.appendChild(el("span", null, entry.label));
          link.appendChild(svgIcon("M7 17 17 7M9 7h8v8"));
          links.appendChild(link);
        });

        if (links.childNodes.length) body.appendChild(links);

        card.appendChild(body);
        node.appendChild(card);
      });
    },

    /* experience.items → 时间线 */
    "experience.items": function (node, items) {
      asArray(items).forEach(function (item) {
        if (!item) return;

        var entry = el("li", "timeline__item");
        entry.appendChild(el("p", "timeline__period", item.period));
        entry.appendChild(el("h3", "timeline__role", item.role));
        entry.appendChild(el("p", "timeline__org", item.org));

        var points = asArray(item.points).filter(Boolean);
        if (points.length) {
          var list = el("ul", "timeline__points");
          points.forEach(function (point) {
            list.appendChild(el("li", null, point));
          });
          entry.appendChild(list);
        }

        node.appendChild(entry);
      });
    },
  };

  /* 按 data-list 的值找到渲染器并渲染；返回 false 说明这个键没有渲染器 */
  function renderList(node, content) {
    var key = node.getAttribute("data-list");
    var renderer = renderers[key];
    if (!renderer) return false;

    clear(node);
    renderer(node, util.getPath(content, key), content);
    return true;
  }

  function renderAll(content, root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-list]");
    var rendered = 0;

    for (var i = 0; i < nodes.length; i += 1) {
      if (renderList(nodes[i], content)) rendered += 1;
    }

    return rendered;
  }

  return {
    renderList: renderList,
    renderAll: renderAll,
    keys: Object.keys(renderers),
  };
})();
