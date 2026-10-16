/* 尽早打上 .js 标记，让 base.css 里的入场动画只在脚本可用时生效。
   放在 head 里同步执行，避免内容先渲染再被隐藏造成闪烁。 */
document.documentElement.className += " js";
