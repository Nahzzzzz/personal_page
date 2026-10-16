/* ============================================================
   内容加载与本地化
   ============================================================
   优先级：后台内容（GET /api/content）> content-zh.js / content-en.js 内置默认值

   首屏先用内置默认值同步画出来，再去请求后台内容，取到后整体重画一次。
   所以后台挂了、接口没通、或者直接用 file:// 打开，页面也完整可见。

   页面上的文字全部靠标记识别，不需要在 JS 里写死：
     data-i18n="hero.name"                  → 元素文本
     data-i18n-href="links.email"           → 映射到 href 属性
     data-i18n-aria-label="links.emailLabel" → 属性名就是前缀去掉后的部分
   ============================================================ */

window.SiteContent = (function () {
  "use strict";

  var util = window.SiteUtil;

  var LOCALES = ["zh", "en"];
  var DEFAULT_LOCALE = "zh";

  var LOCALE_KEY = "site:locale";
  var CACHE_KEY = "site:content:v1";
  var API_URL = "/api/content";

  var HTML_LANG = { zh: "zh-CN", en: "en" };
  var OG_LOCALE = { zh: "zh_CN", en: "en_US" };

  /* 后台存的内容，按语言分开，还没取到时是 null */
  var remote = null;
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

  function defaultsFor(target) {
    return (window.SITE_CONTENT && window.SITE_CONTENT[target]) || {};
  }

  function localOverridesFor(target) {
    return (remote && remote[target]) || undefined;
  }

  /* 内置默认值打底，后台内容盖在上面 */
  function contentFor(target) {
    return util.deepMerge(defaultsFor(target), localOverridesFor(target));
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

        nodes[i].setAttribute(attribute, String(value));
      }
    }
  }

  /* 「下载简历」指向 public/ 里的静态文件，后台只能改文件名、传不了文件。
     没填文件名、或者填了但文件没放进来时，与其让访客点到 404，不如把按钮收起来。 */
  function applyResumeLink(content) {
    var link = document.querySelector('[data-i18n-href="links.resume"]');
    if (!link) return;

    var value = util.getPath(content, "links.resume");
    link.hidden = !value || !String(value).trim();
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

  /* 结构化数据本来是写在 HTML 里的兜底，这里用当前语言的内容覆盖掉 */
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
    applyResumeLink(content);
    applyDocumentMeta();

    /* 列表类内容交给 render.js，它按 data-list 的值挑渲染器 */
    if (window.SiteRender) window.SiteRender.renderAll(content);

    document.dispatchEvent(
      new CustomEvent("site:content", { detail: { locale: locale, content: content } })
    );

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

  /* ---------------- 取后台内容 ---------------- */

  function useCached() {
    var raw = readStorage(CACHE_KEY);
    if (!raw) return false;

    try {
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return false;
      remote = parsed;
      apply();
      return true;
    } catch (error) {
      return false;
    }
  }

  function normalize(payload) {
    if (!payload || typeof payload !== "object") return null;

    var source = payload.content || payload;
    var out = {};

    LOCALES.forEach(function (name) {
      if (util.isPlainObject(source[name])) out[name] = source[name];
    });

    return Object.keys(out).length ? out : null;
  }

  function loadRemote() {
    /* file:// 下没有同源接口，直接用缓存或默认值 */
    if (location.protocol === "file:") {
      useCached();
      return;
    }

    fetch(API_URL, { headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (payload) {
        var normalized = normalize(payload);
        if (!normalized) return;

        remote = normalized;
        writeStorage(CACHE_KEY, JSON.stringify(remote));
        apply();
      })
      .catch(function (error) {
        /* 接口还没部署、离线、或者 Workers 额度用尽都会走到这里。
           用上次缓存顶上，再不行就保持内置默认值，页面依然完整。 */
        console.info("[content] 未能取到后台内容，使用内置内容：" + error.message);
        useCached();
      });
  }

  /* ---------------- 启动 ---------------- */

  function start() {
    apply(); // 先用内置默认值画首屏，不阻塞渲染
    bindToggle();
    loadRemote();
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
    normalize: normalize,
  };
})();

window.SiteContent.start();
