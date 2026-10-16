/* ============================================================
   页面交互：导航状态、移动端菜单、滚动高亮、入场动画
   全部原生实现，没有依赖。
   ============================================================ */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DESKTOP_BREAKPOINT = 900;

  /* ---------------- 导航：滚动后加毛玻璃背景 ---------------- */

  var nav = document.getElementById("nav");

  function syncNavBackground() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  syncNavBackground();
  window.addEventListener("scroll", syncNavBackground, { passive: true });

  /* ---------------- 移动端菜单 ---------------- */

  var burger = document.getElementById("nav-burger");
  var menu = document.getElementById("nav-menu");

  function setMenu(open) {
    if (!menu || !burger) return;
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
  }

  if (burger && menu) {
    burger.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });

    /* 点任意菜单项后收起，否则锚点跳转后菜单会挡住内容 */
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenu(false);
    });

    document.addEventListener("click", function (event) {
      if (!nav.contains(event.target)) setMenu(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > DESKTOP_BREAKPOINT) setMenu(false);
    });
  }

  /* ---------------- 滚动高亮当前区块 ----------------
     用一条窄带（视口中部）判断，比监听 scroll 逐帧计算更省。 */

  var links = Array.prototype.slice.call(document.querySelectorAll(".nav__link"));
  var sections = links
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = "#" + entry.target.id;

          links.forEach(function (link) {
            if (link.getAttribute("href") === id) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* ---------------- 入场动画 ---------------- */

  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

    reveals.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------------- 页脚年份 ---------------- */

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
