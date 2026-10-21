/* ============================================================
   内容加载与本地化
   ============================================================
   文案的唯一来源是 content-zh.js 与 content-en.js。这个文件负责三件事：
     1. 选语言（记住上一次的选择，没有就按浏览器语言猜）
     2. 把内容按 HTML 上的标记刷到页面上
     3. 切换语言时重刷一遍

   页面上的文字全部靠标记识别，不用在 JS 里写死：
     data-i18n="hero.name"                   → 元素文本
     data-i18n-href="links.email"            → 映射到 href 属性
     data-i18n-aria-label="links.emailLabel" → 属性名就是前缀去掉后的部分
   ============================================================ */

window.SiteContent = (function () {
  "use strict";

  var util = window.SiteUtil;

  var LOCALES = ["zh", "en"];
  var DEFAULT_LOCALE = "zh";

  var LOCALE_KEY = "site:locale";

  var HTML_LANG = { zh: "zh-CN", en: "en" };
  var OG_LOCALE = { zh: "zh_CN", en: "en_US" };

  var locale = pickInitialLocale();
  var warned = {};

  /* ---------------- 语言选择 ---------------- */

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      /* 隐私模式下 localStorage 可能直接抛错，忽略即可 */
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* 存不进去不影响本次浏览 */
    }
  }

  function pickInitialLocale() {
    var stored = readStorage(LOCALE_KEY);
    if (LOCALES.indexOf(stored) >= 0) return stored;

    var languages = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < languages.length; i += 1) {
      var tag = String(languages[i] || "").toLowerCase();
      if (tag.indexOf("zh") === 0) return "zh";
      if (tag.indexOf("en") === 0) return "en";
    }

    return DEFAULT_LOCALE;
  }

  /* ---------------- 取值 ---------------- */

  function contentFor(target) {
    return (window.SITE_CONTENT && window.SITE_CONTENT[target]) || {};
  }

  /* ---------------- 往页面上刷 ---------------- */

  function warnMissing(key) {
    if (warned[key]) return;
    warned[key] = true;
    console.warn("[content] 缺少文案（检查两个语言包是否同步）：" + key);
  }

  function applyTextNodes(content) {
    var nodes = document.querySelectorAll("[data-i18n]");

    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var key = node.getAttribute("data-i18n");
      var value = util.getPath(content, key);

      if (value == null) {
        warnMissing(key);
        continue;
      }

      node.textContent = String(value);
    }
  }

  /* data-i18n-xxx 的 xxx 就是属性名。
     这里不做全元素扫描，只认下面这几个白名单属性 —— 页面里只会用到这些，
     写成固定列表可以让选择器直接过滤，省掉遍历全部元素的属性。 */
  var I18N_ATTRIBUTES = ["href", "content", "aria-label", "title", "alt", "src"];

  var I18N_ATTR_SELECTOR = I18N_ATTRIBUTES.map(function (name) {
    return "[data-i18n-" + name + "]";
  }).join(",");

  function applyAttributes(content) {
    var nodes = document.querySelectorAll(I18N_ATTR_SELECTOR);

    for (var i = 0; i < nodes.length; i += 1) {
      for (var j = 0; j < I18N_ATTRIBUTES.length; j += 1) {
        var attribute = I18N_ATTRIBUTES[j];
        var key = nodes[i].getAttribute("data-i18n-" + attribute);

        if (key == null) continue;

        var value = util.getPath(content, key);

        if (value == null) {
          warnMissing(key);
          continue;
        }

        var text = String(value);

        /* href / src 留空时不写进去：否则 <a href=""> 会指向当前页，
           元素是否显示由 applyOptionalLinks 决定 */
        if (!text.trim() && (attribute === "href" || attribute === "src")) continue;

        nodes[i].setAttribute(attribute, text);
      }
    }
  }

  /* 可选链接：links.resume / links.email / links.github / links.linkedin / links.x。
     留空时把整个入口隐藏（社交图标连它的 <li> 一起收起来），避免出现 404
     或者指向不存在邮箱的按钮；填上值就自动显示。 */
  function applyOptionalLinks(content) {
    var nodes = document.querySelectorAll('[data-i18n-href^="links."]');

    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var value = util.getPath(content, node.getAttribute("data-i18n-href"));
      var filled = value != null && String(value).trim() !== "";
      var item = node.closest ? node.closest("li") : null;

      (item || node).hidden = !filled;
    }

    /* 整组图标都没填时，把列表本身也隐藏，否则会留下一截多余间距 */
    var lists = document.querySelectorAll(".social");

    for (var j = 0; j < lists.length; j += 1) {
      lists[j].hidden = !lists[j].querySelector("li:not([hidden])");
    }
  }

  function applyDocumentMeta() {
    var content = contentFor(locale);
    var html = document.documentElement;

    if (html) html.setAttribute("lang", HTML_LANG[locale] || locale);

    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute("content", OG_LOCALE[locale] || locale);

    var ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && content.site && content.site.url) {
      ogUrl.setAttribute("content", content.site.url);
    }

    applyStructuredData(content);
  }

  /* 结构化数据本来写在 HTML 里当兜底，这里用当前语言的内容覆盖掉 */
  function applyStructuredData(content) {
    var node = document.getElementById("structured-data");
    if (!node) return;

    var links = content.links || {};
    var hero = content.hero || {};

    var sameAs = [links.github, links.linkedin, links.x].filter(function (value) {
      return value && value.indexOf("http") === 0;
    });

    var data = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: hero.name || "",
      jobTitle: hero.role || "",
      url: (content.site && content.site.url) || undefined,
      sameAs: sameAs.length ? sameAs : undefined,
    };

    if (links.email) {
      data.email = links.email.indexOf("mailto:") === 0 ? links.email : "mailto:" + links.email;
    }

    node.textContent = JSON.stringify(data);
  }

  function apply() {
    var content = contentFor(locale);

    applyTextNodes(content);
    applyAttributes(content);
    applyOptionalLinks(content);
    applyDocumentMeta();

    /* 列表类内容交给 render.js，它按 data-list 的值挑渲染器 */
    if (window.SiteRender) window.SiteRender.renderAll(content);

    return content;
  }

  /* ---------------- 切换语言 ---------------- */

  function setLocale(next) {
    if (LOCALES.indexOf(next) < 0 || next === locale) return locale;

    locale = next;
    writeStorage(LOCALE_KEY, locale);
    apply();

    return locale;
  }

  function bindToggle() {
    var button = document.getElementById("lang-toggle");
    if (!button) return;

    button.addEventListener("click", function () {
      setLocale(locale === "zh" ? "en" : "zh");
    });
  }

  /* ---------------- 启动 ---------------- */

  function start() {
    apply();
    bindToggle();
  }

  return {
    start: start,
    apply: apply,
    setLocale: setLocale,
    contentFor: contentFor,
    getLocale: function () {
      return locale;
    },
    locales: LOCALES.slice(),
  };
})();

window.SiteContent.start();
