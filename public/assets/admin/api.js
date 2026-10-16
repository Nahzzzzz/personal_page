/* ============================================================
   后台接口封装
   ============================================================
   所有请求都带 Cookie（credentials: same-origin），登录状态由此维持。
   出错时抛出带 status 的 Error，调用方靠 status === 401 判断要不要回到登录页。
   ============================================================ */

window.AdminApi = (function () {
  "use strict";

  function describe(payload, status) {
    if (payload && typeof payload.error === "string") return payload.error;
    return "请求失败（HTTP " + status + "）";
  }

  function request(method, url, body) {
    var options = {
      method: method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };

    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    return fetch(url, options).then(function (response) {
      return response.text().then(function (text) {
        var payload = null;

        if (text) {
          try {
            payload = JSON.parse(text);
          } catch (error) {
            payload = { error: text.slice(0, 200) };
          }
        }

        if (!response.ok) {
          var failure = new Error(describe(payload, response.status));
          failure.status = response.status;
          throw failure;
        }

        return payload;
      });
    });
  }

  return {
    session: function () {
      return request("GET", "/api/session");
    },
    login: function (password) {
      return request("POST", "/api/login", { password: password });
    },
    logout: function () {
      return request("POST", "/api/logout");
    },
    content: function () {
      return request("GET", "/api/content");
    },
    /* patch 只放改动过的字段，服务端做深合并 */
    save: function (locale, patch) {
      return request("PUT", "/api/content", { locale: locale, patch: patch });
    },
    /* 丢掉后台内容，回到 content-*.js 里的内置默认值 */
    reset: function (locale) {
      return request("PUT", "/api/content", { locale: locale, reset: true });
    },
    revisions: function (locale) {
      return request("GET", "/api/revisions?locale=" + encodeURIComponent(locale));
    },
    restore: function (id) {
      return request("POST", "/api/revisions", { id: id });
    },
  };
})();
