# AGENTS.md — 仓库约定与操作手册

> 面向在这个仓库里干活的人（人类或 AI 助手）。面向使用者的安装与部署说明见 [README.md](./README.md)。旧版本的「D1 + 可视化后台」已经整体移除，现在是纯静态站点。

## 1. 项目是什么

一个单页个人主页（纯 HTML / CSS / 原生 JS），中英双语，部署在 Cloudflare Pages。

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 页面 | 原生 HTML / CSS | `public/index.html` + `assets/css/*` |
| 内容 | 普通 JS 对象 | `content-zh.js` / `content-en.js` 挂到 `window.SITE_CONTENT` |
| 渲染 | 原生 JS | 按 `data-i18n` / `data-list` 标记把内容刷进 DOM |
| 后端 | 无 | 没有接口、没有数据库、没有密钥 |
| 工具链 | 只有 `wrangler`（开发依赖） | 本地预览和部署，站点本身不依赖它 |

四条不能破的不变量：

1. **两个语言包结构必须逐层一致。** `content-zh.js` 与 `content-en.js` 的键对不上时，切到缺字段的那份会留空。`content.js` 会在控制台打印 `[content] 缺少文案：<path>`。
2. **HTML 里的文字只是兜底。** 页面上最终显示的值来自 JS 内容包。改文案改 JS，`public/index.html` 里那份默认值顺手对齐即可（给搜索引擎和不跑 JS 的访客看的）。
3. **所有文案都用 `textContent` / `setAttribute` 写入。** 不用 `innerHTML`，文案里出现 `<script>` 也不会被当成 HTML 执行。
4. **不发任何网络请求。** 没有 fetch、没有 CDN、没有外链字体。页面在 `file://` 下打开也必须是完整的。

## 2. 常用命令

```bash
npm install

npm run dev       # 本地预览：http://localhost:8788（wrangler pages dev）
npm run deploy    # 部署到 Cloudflare Pages（wrangler pages deploy）
```

不想装依赖就直接双击 `public/index.html` —— 现在的代码不 fetch 任何东西，直接打开和线上表现一致。

## 3. 代码地图

```
public/                     唯一会被上传到 Cloudflare 的目录
  index.html                骨架：data-i18n 标记、data-list 挂载点、ld+json 兜底
  _headers                  静态资源的响应头（安全头）
  robots.txt                允许收录
  favicon.svg               图标
  assets/css/
    tokens.css              设计变量（配色、字号、间距、圆角、断点宽度）
    base.css                reset、排版、按钮、标签、入场动画、减少动态效果
    sections.css            各区块布局与响应式（900px / 560px）
  assets/js/
    boot.js                 head 内同步执行，给 <html> 加 .js（入场动画的前置条件）
    util.js                 只有一个 getPath：把 "hero.name" 当成路径取值
    content-zh.js           中文文案（唯一来源）
    content-en.js           英文文案（结构与中文逐层一致）
    render.js               列表类内容 → DOM，按 data-list 的值挑渲染器
    content.js              语言选择、刷 DOM、切换语言
    main.js                 导航状态、移动端菜单、滚动高亮、入场动画

wrangler.toml               Pages 项目名 + 输出目录
package.json                只有 wrangler 一个开发依赖
```

脚本加载顺序有依赖，`index.html` 底部固定为：`util` → `content-zh` → `content-en` → `render` → `content` → `main`。`content.js` 末尾会自己调 `SiteContent.start()`。

## 4. 硬约束

这些不是偏好，是这个项目成立的前提。

- **不引入构建步骤。** 没有打包器、没有编译器、没有 PostCSS。`public/` 里的文件就是上线时的文件。
- **不引入运行时依赖，不加 CDN。** 字体走系统字体栈，图标是内联 SVG，缩略图是 CSS 渐变。加一个外链就多一次渲染阻塞和一类可用性风险。
- **不加后端。** 没有接口、没有数据库、没有密钥；要改内容就改文件。想加回「可视化后台」是另一个架构决定，别顺手加。
- **不用 `innerHTML` / `insertAdjacentHTML` / `eval` / `new Function`。** 文案全部走 `textContent`。
- **不在客户端用 ES module 或 `import`。** 脚本要能在 `file://` 下按 `<script>` 顺序执行，模块化会让这条路径失效。
- **不写死颜色和间距。** `base.css` / `sections.css` 里一律用 `var(--*)`，变量只在 `tokens.css` 定义。
- **不改文案就不要动 HTML 结构。** 九成改动是改 `content-zh.js` / `content-en.js`，两个文件一起改。

## 5. 常见改动怎么做

### 5.1 改一句文案

在 `content-zh.js` 和 `content-en.js` 里改**同一个键**。只需要记住：

- 键路径 = HTML 上 `data-i18n="..."` 的值。
- 两个语言包都要改，否则切语言会缺字段（控制台有警告）。
- `public/index.html` 里对应的兜底文字可以顺手对齐，不改也不影响访客看到的内容。

### 5.2 新增一个字段

按顺序做三件事：

1. **加内容**：`content-zh.js` 与 `content-en.js` 在同一个父路径下加同名键，值类型一致。
2. **让页面用它**：
   - 标量（文字、链接、无障碍提示）→ 在 `public/index.html` 加标记：`data-i18n="path"` 改文本，`data-i18n-href="path"` 之类改属性。属性白名单只有 `href` / `content` / `aria-label` / `title` / `alt` / `src`，要加别的先改 `content.js` 里的 `I18N_ATTRIBUTES`。
   - 列表 → 加 `data-list="path"` 挂载点，并在 `render.js` 的 `renderers` 里注册渲染器（见 5.3）。
   - `data-i18n` 只能放在叶子节点上，否则会把子元素一起抹掉。
3. **补兜底**：把 HTML 里那个元素的初始文字写成人话（不跑 JS 的访客和爬虫看到的就是它）。

路径写错不会抛错，只会在控制台打印「缺少文案」并保持原样，所以改完记得看一眼控制台。

### 5.3 新增列表渲染器

在 `render.js` 的 `renderers` 对象里加一个键，键名就是内容里的点号路径，然后在 `index.html` 里给容器加 `data-list="同一个路径"`。渲染函数拿到的是这个路径上的值，必须是数组；元素一律用 `el(tag, className, text)` 或 `createElement` 构建。返回值不用管，`renderAll` 会在每次 `apply()` 时把挂载点清空重画。

### 5.4 加一种语言

语言列表硬编码在几处，一起改（目前只有 `zh` / `en`）：

1. 新建 `public/assets/js/content-XX.js`（照抄 `content-zh.js` 的结构）。
2. `content.js`：`LOCALES`、`HTML_LANG`、`OG_LOCALE`。
3. `public/index.html`：在 `content-en.js` 之后加一条 `<script src="assets/js/content-XX.js" defer>`。

切换按钮目前是「中英互切」，加到第三种语言时要同时改 `bindToggle()` 里的逻辑。

### 5.5 改配色与间距

只改 `tokens.css`。需要新的断点时优先用 `clamp()` 做流体缩放，只有布局真的换形态时才加媒体查询。

## 6. 内容字段速查

顶层 13 个键，对应页面从上到下的区块。

| 顶层键 | 页面位置 | 路径与形态 |
| --- | --- | --- |
| `meta` | 浏览器标签、搜索结果 | `title`、`description`（标量） |
| `site` | 结构化数据 | `url`（标量，写进 `og:url` 和 ld+json） |
| `a11y` | 跳转链接 | `skip`（跳转正文链接的文字） |
| `nav` | 顶栏 | `brand`、`label`、`about`、`skills`、`projects`、`experience`、`contact`、`menu`、`langSwitch`（全为标量） |
| `links` | 首屏与联系区 | `resume`（文件名，留空则隐藏按钮）、`email`（带 `mailto:`）、`github`、`linkedin`、`x`、`socialLabel`、`githubLabel`、`linkedinLabel`、`xLabel`、`emailLabel`。`resume` / `email` / `github` / `linkedin` / `x` 留空时，对应入口（含社交图标和整组列表）自动隐藏，不会留下死链 |
| `hero` | 首屏 | `status`、`name`、`role`、`lead`、`ctaProjects`、`ctaResume` |
| `terminal` | 首屏终端卡片 | `label`、`whoami`、`focus`、`now` |
| `about` | 关于我 | `eyebrow`、`title`、`lead`；`paragraphs`（字符串数组）；`facts`（对象数组：`label`、`value`） |
| `skills` | 技能 | `eyebrow`、`title`、`lead`；`groups`（对象数组：`title`、`items` 字符串数组） |
| `projects` | 项目 | `eyebrow`、`title`、`lead`、`demoLabel`、`codeLabel`；`items`（对象数组：`title`、`desc`、`stack` 数组、`demo`、`code`，后两者留空则不渲染入口） |
| `experience` | 工作经历 | `eyebrow`、`title`、`lead`；`items`（对象数组：`period`、`role`、`org`、`points` 数组） |
| `contact` | 联系 | `eyebrow`、`title`、`lead`、`email`（按钮上显示的文字） |
| `footer` | 页脚 | `name`、`note`、`top` |

五类列表由 `render.js` 生成，挂载点分别是 `about.paragraphs`、`about.facts`、`skills.groups`、`projects.items`、`experience.items`。

## 7. 验证

没有测试脚本，改完按这个顺序手工过一遍：

1. 打开 `public/index.html`（或 `npm run dev`），确认页面完整、没有空白区块。
2. 打开控制台，确认没有 `[content] 缺少文案` 的警告 —— 有就是两个语言包的键对不上。
3. 点右上角语言按钮，确认整页切成英文、再切回来正常。
4. 缩小窗口到 900px 以下，确认移动端菜单能开能关。
5. 改完文案后硬刷新（`Ctrl / Cmd + Shift + R`），避免浏览器缓存旧 JS。

## 8. 部署

线上地址：**https://personal-page-2xn.pages.dev**（`personal-page.pages.dev` 已被占用，Cloudflare 自动加了后缀）。

两种方式：

- **Git 集成**：Workers & Pages → `personal-page` → Settings → Builds，Build command 和 Deploy command 都留空，Build output directory 填 `public`。
- **本地部署**：`npx wrangler login` 之后 `npm run deploy`。

容易踩的点：

- **Deploy command 不能填 `wrangler deploy`。** 那是 Workers 的命令，在这个项目上会报 `Missing entry-point to Worker script or to assets directory`，一个文件都不会上传。留空或填 `npx wrangler pages deploy`。
- **`wrangler.toml` 是 Pages 项目配置的唯一来源。** 用它部署过之后控制台里对应字段变只读，要改就改文件再部署。
- **改了 `_headers` 要重新部署才生效。** 它是部署产物的一部分，不是运行时可变的配置。
- **Git 集成构建的是最后一次 commit，不是你的工作区。** 本地改完要 commit + push。

## 9. 已知坑

| 坑 | 说明 |
| --- | --- |
| 语言包不同步 | 切到缺字段的那份会留空，控制台打印「缺少文案」。加字段时两个文件一起加。 |
| HTML 里的文字和 JS 里的对不上 | HTML 里那份只是兜底，页面加载后会被 JS 覆盖。看到不一致先刷新缓存。 |
| 首屏语言可能闪一下 | HTML 里默认中文，英文访客要等 JS 跑完才切；换来的是不依赖 JS 也能看到内容。 |
| 简历按钮指向 404 | 按钮只在 `links.resume` 有值、且 `public/` 里真有这个文件时才点得通。没有简历就把 `links.resume` 留空，按钮会隐藏。 |
| 可选链接默认隐藏 | `links.email` / `github` / `linkedin` / `x` 为空时，`content.js` 的 `applyOptionalLinks` 会隐藏对应按钮或整个社交图标列表（HTML 里也预置了 `hidden`，不跑 JS 时同样不显示）。填上值就自动出现，不需要改 HTML。 |
| `og:` 与 ld+json 是两份 | HTML 里那份是给不跑 JS 的爬虫的兜底，页面加载后会用当前语言的内容覆盖一次。 |
| 缓存 | 改的是 JS 文件，浏览器可能缓存旧版本，调试时用硬刷新或 DevTools 的 Disable cache。 |
