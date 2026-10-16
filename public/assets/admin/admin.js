/* ============================================================
   后台编辑器
   ============================================================
   表单由 schema.js 的字段定义生成，不用手写 HTML。

   几个关键设计：
   1. 编辑的是一份「本地副本」（state.working），改的时候只往副本里写，
      点保存才把改动过的字段作为补丁发出去。所以保存前可以随意改、随时放弃。
   2. 数组（项目、经历、技能分组…）内部任何改动都标记「整个数组」为脏。
      因为服务端是数组整体替换语义，只发数组里的一项会变成对象。
   3. 提交前用 util.shallowestPaths 去掉被父路径覆盖的路径，避免同时发
      skills.groups 和 skills.groups.0.items 这种自相矛盾的补丁。
   ============================================================ */

(function () {
  "use strict";

  var util = window.SiteUtil;
  var schema = window.AdminSchema;
  var api = window.AdminApi;

  var state = {
    locale: schema.locales[0].id,
    section: schema.sections[0].id,
    defaults: {}, // locale -> content-*.js 里的内置内容
    working: {}, // locale -> 可编辑副本（内置内容 + 后台内容）
    dirty: {}, // locale -> { path: true }
    saving: false,
    toastTimer: null,
  };

  var dom = {};

  /* ---------------- DOM 小工具 ---------------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null && text !== "") node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function button(label, className, onClick) {
    var node = el("button", className || "btn btn--ghost btn--sm", label);
    node.type = "button";
    node.addEventListener("click", onClick);
    return node;
  }

  /* ---------------- 状态读写 ---------------- */

  function content(locale) {
    return state.working[locale] || {};
  }

  function dirtySet(locale) {
    if (!state.dirty[locale]) state.dirty[locale] = {};
    return state.dirty[locale];
  }

  function dirtyPaths(locale) {
    return Object.keys(dirtySet(locale));
  }

  function markDirty(locale, path) {
    dirtySet(locale)[path] = true;
  }

  function valueOf(locale, path) {
    return util.getPath(content(locale), path);
  }

  /* 取到 working 里的活数组引用，后续原地增删会直接反映到 working 上 */
  function liveList(locale, path) {
    var value = util.getPath(content(locale), path);
    if (Array.isArray(value)) return value;

    util.setPath(state.working[locale], path, []);
    return util.getPath(content(locale), path);
  }

  /* 这个路径属于哪个区块，用来在侧边栏显示改动数量 */
  function sectionOf(path) {
    var found = null;

    schema.sections.forEach(function (section) {
      if (found) return;

      var hit = section.fields.some(function (field) {
        return path === field.path || path.indexOf(field.path + ".") === 0;
      });

      if (hit) found = section;
    });

    return found;
  }

  /* ---------------- 提示与状态同步 ---------------- */

  function syncChrome() {
    var total = 0;
    var parts = [];

    schema.locales.forEach(function (locale) {
      var count = dirtyPaths(locale.id).length;
      total += count;
      if (count) parts.push(locale.label + " " + count + " 处");
    });

    if (state.saving) {
      dom.status.textContent = "保存中…";
      dom.status.className = "status status--busy";
    } else if (total) {
      dom.status.textContent = "未保存：" + parts.join(" · ");
      dom.status.className = "status status--dirty";
    } else {
      dom.status.textContent = state.updatedAt ? "已同步" : "还没有后台内容，当前显示内置默认值";
      dom.status.className = "status";
    }

    dom.save.disabled = state.saving || total === 0;
    dom.save.textContent = total ? "保存 " + total + " 处改动" : "保存";

    /* 当前区块的字段上标出「已改过」，刷新前先看看有没有变化 */
    var current = state.locale;
    var marks = dom.form.querySelectorAll("[data-mark]");

    for (var i = 0; i < marks.length; i += 1) {
      var mark = marks[i].getAttribute("data-mark");
      marks[i].classList.toggle("is-dirty", Boolean(dirtySet(current)[mark]));
    }

    renderSidebar();
  }

  function toast(message, kind) {
    dom.toast.hidden = false;
    dom.toast.textContent = message;
    dom.toast.className = "toast toast--" + (kind || "ok");

    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      dom.toast.hidden = true;
    }, kind === "error" ? 8000 : 3000);
  }

  function handleError(error) {
    if (error && error.status === 401) {
      showGate("登录状态已失效，请重新登录");
      return;
    }

    toast((error && error.message) || "操作失败", "error");
  }

  /* ---------------- 登录门 ---------------- */

  function showGate(message) {
    dom.studio.hidden = true;
    dom.gate.hidden = false;
    dom.loginMessage.textContent = message || "";
    dom.password.value = "";
    dom.password.focus();
  }

  function submitLogin(event) {
    event.preventDefault();

    var password = dom.password.value;
    if (!password) return;

    dom.loginButton.disabled = true;
    dom.loginMessage.textContent = "正在验证…";

    api
      .login(password)
      .then(function () {
        dom.password.value = "";
        return startStudio();
      })
      .catch(function (error) {
        dom.loginMessage.textContent = error.message || "登录失败";
      })
      .then(function () {
        dom.loginButton.disabled = false;
      });
  }

  /* ---------------- 启动编辑视图 ---------------- */

  function startStudio() {
    return api.content().then(function (payload) {
      var remote = payload.content || {};

      schema.locales.forEach(function (locale) {
        state.defaults[locale.id] = (window.SITE_CONTENT && window.SITE_CONTENT[locale.id]) || {};
        /* 和前台 content.js 用同一套合并规则，所以后台看到的正是站点上显示的内容 */
        acceptStored(locale.id, remote[locale.id]);
      });

      state.updatedAt = payload.updatedAt;

      dom.gate.hidden = true;
      dom.studio.hidden = false;

      renderLocaleTabs();
      renderEditor();
      syncChrome();

      return loadHistory();
    });
  }

  /* ---------------- 侧边栏 ---------------- */

  function renderSidebar() {
    if (dom.studio.hidden) return;

    var counts = {};

    dirtyPaths(state.locale).forEach(function (path) {
      var section = sectionOf(path);
      if (!section) return;
      counts[section.id] = (counts[section.id] || 0) + 1;
    });

    clear(dom.sidebar);

    schema.sections.forEach(function (section) {
      var item = el("a", "sidebar__item");
      item.href = "#" + section.id;

      if (section.id === state.section) item.classList.add("is-active");
      if (counts[section.id]) item.classList.add("is-dirty");

      item.appendChild(el("span", "sidebar__label", section.title));
      if (counts[section.id]) item.appendChild(el("span", "sidebar__count", String(counts[section.id])));

      item.addEventListener("click", function (event) {
        event.preventDefault();
        selectSection(section.id);
      });

      dom.sidebar.appendChild(item);
    });
  }

  function selectSection(id) {
    state.section = id;
    renderEditor();
    renderSidebar();
    syncChrome();
    dom.editor.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function renderLocaleTabs() {
    clear(dom.localeTabs);

    schema.locales.forEach(function (locale) {
      var tab = el("button", "tab", locale.label);
      tab.type = "button";

      if (locale.id === state.locale) tab.classList.add("is-active");
      if (dirtyPaths(locale.id).length) tab.classList.add("is-dirty");

      tab.addEventListener("click", function () {
        if (locale.id === state.locale) return;

        state.locale = locale.id;
        renderLocaleTabs();
        renderEditor();
        syncChrome();
        loadHistory();
      });

      dom.localeTabs.appendChild(tab);
    });
  }

  /* ---------------- 表单 ---------------- */

  function renderEditor() {
    var section = schema.section(state.section);

    dom.sectionTitle.textContent = section.title;
    dom.sectionDesc.textContent = section.desc || "";
    clear(dom.form);

    section.fields.forEach(function (field) {
      if (field.type === "cards") {
        dom.form.appendChild(cardField(field));
      } else if (field.type === "list") {
        dom.form.appendChild(listField(field));
      } else {
        dom.form.appendChild(scalarField(field));
      }
    });
  }

  /* 标量字段：直接读写 working 上的这个路径 */
  function scalarField(spec, options) {
    var settings = options || {};
    var locale = state.locale;
    var absolutePath = settings.absolutePath || spec.path;
    var container = settings.container || null;
    var wrap = el("div", "field");
    var id = "f-" + absolutePath.replace(/[^a-zA-Z0-9]+/g, "-");

    var input;

    if (spec.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
    } else {
      input = document.createElement("input");
      input.type = spec.type === "url" ? "url" : "text";
    }

    input.id = id;
    input.className = "input" + (spec.type === "textarea" ? " input--area" : "");
    input.spellcheck = false;

    var current = valueOf(locale, absolutePath);
    input.value = current == null ? "" : String(current);

    input.addEventListener("input", function () {
      util.setPath(state.working[locale], absolutePath, input.value);
      markDirty(locale, container || absolutePath);
      syncChrome();
    });

    var label = el("label", "field__label", spec.label);
    label.setAttribute("for", id);

    wrap.appendChild(label);
    wrap.appendChild(input);
    if (spec.hint) wrap.appendChild(el("p", "field__hint", spec.hint));

    wrap.setAttribute("data-mark", container || absolutePath);

    return wrap;
  }

  /* 字符串数组，比如 about.paragraphs、projects.items[].stack */
  function listField(spec, options) {
    var settings = options || {};
    var locale = state.locale;
    var listPath = settings.absolutePath || spec.path;
    var container = settings.container || spec.path;

    return repeater({
      label: spec.label,
      hint: spec.hint,
      addLabel: spec.addLabel || "添加一条",
      itemLabel: spec.itemLabel || "条目",
      listPath: listPath,
      container: container,
      createItem: function () {
        return "";
      },
      itemTitle: function (item, index) {
        return item ? String(item).slice(0, 40) : "空白条目 " + (index + 1);
      },
      renderBody: function (body, item, index) {
        var input = document.createElement("input");
        input.className = "input";
        input.type = "text";
        input.spellcheck = false;
        input.value = item == null ? "" : String(item);

        input.addEventListener("input", function () {
          var list = liveList(locale, listPath);
          list[index] = input.value;
          markDirty(locale, container);
          syncChrome();
        });

        body.appendChild(input);
      },
    });
  }

  /* 对象数组，比如 about.facts、projects.items、experience.items */
  function cardField(spec) {
    var locale = state.locale;

    return repeater({
      label: spec.label,
      hint: spec.hint,
      addLabel: spec.addLabel || "添加一项",
      itemLabel: "项",
      listPath: spec.path,
      container: spec.path,
      createItem: function () {
        var blank = {};
        spec.fields.forEach(function (field) {
          blank[field.path] = field.type === "list" ? [] : "";
        });
        return blank;
      },
      itemTitle: function (item, index) {
        var title = item && item[spec.itemTitle];
        return title ? String(title) : "未命名 " + (index + 1);
      },
      renderBody: function (body, item, index) {
        spec.fields.forEach(function (field) {
          var absolutePath = spec.path + "." + index + "." + field.path;

          if (field.type === "list") {
            body.appendChild(
              listField(field, { absolutePath: absolutePath, container: spec.path })
            );
          } else {
            body.appendChild(scalarField(field, { absolutePath: absolutePath, container: spec.path }));
          }
        });
      },
    });
  }

  /* 通用「可增删排序」列表外壳，字符串数组和对象数组共用 */
  function repeater(options) {
    var locale = state.locale;
    var list = liveList(locale, options.listPath);

    var wrap = el("div", "field field--list");
    wrap.setAttribute("data-mark", options.container);

    var head = el("div", "field__head");
    head.appendChild(el("span", "field__label", options.label));
    head.appendChild(el("span", "field__count", list.length + " " + options.itemLabel));
    wrap.appendChild(head);

    if (options.hint) wrap.appendChild(el("p", "field__hint", options.hint));

    var items = el("div", "repeater");

    list.forEach(function (item, index) {
      items.appendChild(repeaterItem(options, item, index, list.length));
    });

    wrap.appendChild(items);

    wrap.appendChild(
      button(options.addLabel, "btn btn--ghost btn--sm repeater__add", function () {
        list.push(options.createItem());
        commit(locale, options);
      })
    );

    return wrap;
  }

  function repeaterItem(options, item, index, total) {
    var locale = state.locale;
    var card = el("div", "item");

    var head = el("div", "item__head");
    head.appendChild(el("span", "item__index", String(index + 1)));
    head.appendChild(el("span", "item__title", options.itemTitle(item, index)));

    var actions = el("div", "item__actions");

    if (index > 0) {
      actions.appendChild(
        button("↑", "icon-btn", function () {
          moveItem(locale, options, index, -1);
        })
      );
    }

    if (index < total - 1) {
      actions.appendChild(
        button("↓", "icon-btn", function () {
          moveItem(locale, options, index, 1);
        })
      );
    }

    actions.appendChild(
      button("删除", "icon-btn icon-btn--danger", function () {
        var list = liveList(locale, options.listPath);

        if (!window.confirm("删除「" + options.itemTitle(item, index) + "」？保存后才会真正生效。")) {
          return;
        }

        list.splice(index, 1);
        commit(locale, options);
      })
    );

    head.appendChild(actions);
    card.appendChild(head);

    var body = el("div", "item__body");
    options.renderBody(body, item, index);
    card.appendChild(body);

    return card;
  }

  /* 数组结构变了（增删改序），整块重画。
     working 是唯一真相，所以重画不会丢已经输入的内容。 */
  function commit(locale, options) {
    markDirty(locale, options.container);
    renderEditor();
    syncChrome();
  }

  function moveItem(locale, options, index, delta) {
    var list = liveList(locale, options.listPath);
    var target = index + delta;

    if (target < 0 || target >= list.length) return;

    var swapped = list[index];
    list[index] = list[target];
    list[target] = swapped;

    commit(locale, options);
  }

  /* ---------------- 保存 ---------------- */

  function buildPatch(locale) {
    var patch = {};

    util.shallowestPaths(dirtyPaths(locale)).forEach(function (path) {
      util.setPath(patch, path, util.clone(valueOf(locale, path)));
    });

    return patch;
  }

  /* D1 里存的是「只改过的字段」（服务端做深合并），所以读回来的内容必须
     再叠一层内置默认值，才是页面和编辑器该显示的样子。
     少了这一步，保存后表单里那些没改过的字段会全部变成空白。 */
  function acceptStored(locale, stored) {
    state.working[locale] = util.deepMerge(state.defaults[locale], stored);
    state.dirty[locale] = {};

    return state.working[locale];
  }

  function saveOne(locale) {
    var patch = buildPatch(locale);
    var expected = util.deepMerge(content(locale), patch);

    return api.save(locale, patch).then(function (payload) {
      var merged = acceptStored(locale, payload.content || {});

      /* 合并后读回来的内容应该和本地预期一致；不一致说明字段定义和语言包对不上了 */
      var mismatched = util.diffPaths(expected, merged);

      return { locale: locale, mismatched: mismatched, updatedAt: payload.updatedAt };
    });
  }

  function saveAll() {
    var pending = schema.locales
      .filter(function (locale) {
        return dirtyPaths(locale.id).length > 0;
      })
      .map(function (locale) {
        return locale.id;
      });

    if (!pending.length) return;

    state.saving = true;
    syncChrome();

    var chain = Promise.resolve();
    var mismatched = [];

    pending.forEach(function (locale) {
      chain = chain.then(function () {
        return saveOne(locale).then(function (result) {
          if (result.updatedAt) state.updatedAt = result.updatedAt;
          if (result.mismatched.length) mismatched.push(result);
        });
      });
    });

    chain
      .then(function () {
        /* 校验不通过时要说出来，不能被下面那句成功提示盖掉 */
        if (mismatched.length) {
          var first = mismatched[0];
          var label = first.locale === "zh" ? "中文" : "English";

          toast(
            "已保存，但" + label + "读回来的内容和预期不一致：" +
              first.mismatched.slice(0, 3).join("、") + "（共 " + first.mismatched.length + " 处）",
            "error"
          );
        } else {
          toast("已保存，刷新站点即可看到", "ok");
        }

        renderLocaleTabs();
        renderEditor();
        return loadHistory();
      })
      .catch(handleError)
      .then(function () {
        state.saving = false;
        syncChrome();
      });
  }

  /* ---------------- 历史版本 ---------------- */

  function formatTime(iso) {
    if (!iso) return "";

    var date = new Date(iso);
    if (isNaN(date.getTime())) return iso;

    var pad = function (value) {
      return String(value).padStart(2, "0");
    };

    return (
      date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      " " + pad(date.getHours()) + ":" + pad(date.getMinutes())
    );
  }

  function loadHistory() {
    clear(dom.history);
    dom.history.appendChild(el("p", "history__empty", "加载中…"));

    return api
      .revisions(state.locale)
      .then(function (payload) {
        var revisions = payload.revisions || [];
        clear(dom.history);

        if (!revisions.length) {
          dom.history.appendChild(
            el("p", "history__empty", "还没有历史版本。每次保存都会自动留一份快照。")
          );
          return;
        }

        revisions.forEach(function (revision, index) {
          var row = el("div", "history__item");
          row.appendChild(el("span", "history__time", formatTime(revision.createdAt)));
          row.appendChild(el("span", "history__size", Math.round((revision.size || 0) / 1024) + " KB"));
          if (index === 0) row.appendChild(el("span", "history__tag", "最新"));

          row.appendChild(
            button("恢复", "icon-btn", function () {
              if (!window.confirm("用这个版本覆盖当前内容？现在的版本也会被存成一条历史。")) return;

              api
                .restore(revision.id)
                .then(function () {
                  toast("已恢复，刷新站点即可看到", "ok");
                  return startStudio();
                })
                .catch(handleError);
            })
          );

          dom.history.appendChild(row);
        });
      })
      .catch(function (error) {
        clear(dom.history);
        dom.history.appendChild(el("p", "history__empty", "历史版本读取失败：" + error.message));
      });
  }

  /* ---------------- 导出 / 导入 / 恢复默认 ---------------- */

  function exportJson() {
    var payload = {
      exportedAt: new Date().toISOString(),
      content: {},
    };

    schema.locales.forEach(function (locale) {
      payload.content[locale.id] = content(locale.id);
    });

    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = "site-content.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast("已导出当前内容", "ok");
  }

  function importJson(file) {
    var reader = new FileReader();

    reader.onload = function () {
      var payload;

      try {
        payload = JSON.parse(String(reader.result));
      } catch (error) {
        toast("这个文件不是合法 JSON", "error");
        return;
      }

      var incoming = payload && payload.content ? payload.content : payload;
      var targets = schema.locales.filter(function (locale) {
        return util.isPlainObject(incoming[locale.id]);
      });

      if (!targets.length) {
        toast("文件里没有可识别的内容", "error");
        return;
      }

      var names = targets
        .map(function (locale) {
          return locale.label;
        })
        .join("、");

      if (!window.confirm("用文件里的内容整体覆盖：" + names + "？")) return;

      var chain = Promise.resolve();

      targets.forEach(function (locale) {
        chain = chain.then(function () {
          return api.save(locale.id, incoming[locale.id]);
        });
      });

      chain
        .then(function () {
          toast("导入完成", "ok");
          return startStudio();
        })
        .catch(handleError);
    };

    reader.onerror = function () {
      toast("文件读取失败", "error");
    };

    reader.readAsText(file);
  }

  function resetLocale() {
    var label = state.locale === "zh" ? "中文" : "English";

    if (
      !window.confirm(
        "把「" + label + "」恢复到内置默认内容？后台保存的这部分内容会被清掉，当前版本会留在历史里。"
      )
    ) {
      return;
    }

    api
      .reset(state.locale)
      .then(function () {
        state.working[state.locale] = util.clone(state.defaults[state.locale]) || {};
        state.dirty[state.locale] = {};
        state.updatedAt = null;

        renderEditor();
        syncChrome();
        renderLocaleTabs();
        toast("已恢复默认内容", "ok");

        return loadHistory();
      })
      .catch(handleError);
  }

  function logout() {
    if (dirtyPaths(state.locale).length && !window.confirm("还有未保存的改动，确定退出？")) return;

    api
      .logout()
      .then(function () {
        showGate("已退出登录");
      })
      .catch(handleError);
  }

  /* ---------------- 绑定 ---------------- */

  function cacheDom() {
    [
      "gate",
      "studio",
      "login-form",
      "password",
      "login-button",
      "login-message",
      "locale-tabs",
      "sidebar",
      "section-title",
      "section-desc",
      "form",
      "status",
      "save",
      "logout",
      "history",
      "export",
      "import",
      "import-file",
      "reset",
      "toast",
      "editor",
    ].forEach(function (id) {
      var key = id.replace(/-([a-z])/g, function (match, letter) {
        return letter.toUpperCase();
      });
      dom[key] = document.getElementById(id);
    });
  }

  function bind() {
    dom.loginForm.addEventListener("submit", submitLogin);
    dom.save.addEventListener("click", saveAll);
    dom.logout.addEventListener("click", logout);
    dom.export.addEventListener("click", exportJson);
    dom.reset.addEventListener("click", resetLocale);

    dom.import.addEventListener("click", function () {
      dom.importFile.click();
    });

    dom.importFile.addEventListener("change", function () {
      if (dom.importFile.files && dom.importFile.files[0]) importJson(dom.importFile.files[0]);
      dom.importFile.value = "";
    });

    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveAll();
      }
    });

    window.addEventListener("beforeunload", function (event) {
      var pending = schema.locales.some(function (locale) {
        return dirtyPaths(locale.id).length > 0;
      });

      if (!pending) return;

      event.preventDefault();
      event.returnValue = "";
    });
  }

  function boot() {
    cacheDom();
    bind();

    api
      .session()
      .then(function (payload) {
        if (payload.authenticated) return startStudio();

        showGate(
          payload.configured === false
            ? "服务端还没有配置 ADMIN_PASSWORD，先在 Cloudflare 的环境变量里设置后再登录。"
            : ""
        );
      })
      .catch(function (error) {
        showGate("连不上后台接口：" + error.message);
      });
  }

  boot();
})();
