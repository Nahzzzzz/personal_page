# AGENTS.md — 仓库约定与操作手册

> 面向在这个仓库里干活的人（人类或 AI 助手）。技术方案的来龙去脉见 [docs/TECH_DESIGN.md](./docs/TECH_DESIGN.md)，需求与验收标准见 [docs/PRD.md](./docs/PRD.md)，面向使用者的安装与部署说明见 [README.md](./README.md)。

## 1. 项目是什么

一个单页个人主页（纯 HTML / CSS / 原生 JS）加一套可视化内容后台。页面上的文字由「代码里的内置默认值 + D1 里保存的改动」合并得到，所以改一句自我介绍不需要改代码、不需要重新部署。

| 层 | 技术 | 说明 |
| --- | --- | --- |
| 前台 | 原生 HTML / CSS / JS | 无框架、无构建、无第三方请求，脚本按 `<script defer>` 顺序加载 |
| 后台 | 原生 JS | `/admin` 页面，表单由 `schema.js` 的字段定义生成 |
| 接口 | Cloudflare Pages Functions | `functions/api/*.js`，ESM，导出 `onRequestGet` / `onRequestPut` 之类 |
| 存储 | Cloudflare D1（SQLite） | `content` 存改动，`revisions` 存历史快照 |
| 工具链 | 只有 `wrangler` | 生产依赖 0 个 |

三条不能破的不变量：

1. **内置默认值必须完整。** 接口没通、D1 没绑、甚至用 `file://` 打开时，页面都要能完整显示。任何新增内容字段都要先在 `content-zh.js` / `content-en.js` 里给它一个默认值。
2. **D1 里只存改动过的字段**，合并规则只有一套：深合并，数组整体替换，类型不符的覆盖被忽略。前台 `public/assets/js/util.js` 与后台 `functions/api/_lib/http.js` 各有一份 `deepMerge`，语义必须完全一致。
3. **页面上所有来自后台的文字都用 `createElement` + `textContent` 构建。** 后台里敲进去的任何字符都要当成纯文本，不能变成 HTML 或脚本。

## 2. 常用命令

```bash
npm install

npm run db:init         # 建本地 D1 表（数据落在 .wrangler/state）
npm run dev             # 本地起服务：站点 /   后台 /admin

npm run db:create       # 线上建库，输出 database_id，填进 wrangler.toml
npm run db:init:remote  # 线上建表（幂等）
npm run project:create  # 建 Pages 项目
npm run secret:password # 交互式写入 ADMIN_PASSWORD
npm run secret:session  # 交互式写入 SESSION_SECRET
npm run deploy          # 部署
npm run tail            # 看线上 Functions 日志
```

回归脚本（无依赖的 Node ESM，直接跑；`dev` 起的服务要在另一个终端里开着）：

```bash
node .verify.mjs    # 纯逻辑，不需要服务：合并规则、补丁往返、鉴权、存储层 SQL
node .e2e.mjs       # 需要 npm run dev：打真实接口 + 本地 D1，自己负责清库收尾
```

两个脚本都被 `.gitignore` 忽略，属于开发机上的工具，不进仓库。`.e2e.mjs` 里硬编码了本地开发密码，必须与 `.dev.vars` 的 `ADMIN_PASSWORD` 一致。它们会清空本地 D1 里两种语言的内容，不会碰线上。

## 3. 代码地图

```
public/                     唯一会被上传到 Cloudflare 的目录
  index.html                前台骨架：data-i18n 标记、data-list 挂载点、ld+json 兜底
  _headers / _routes.json   静态资源响应头；只把 /api/* 交给 Functions
  robots.txt                屏蔽 /admin 与 /api
  admin/index.html          后台外壳：登录门 + 顶栏 + 侧边栏 + 表单容器 + 历史栏
  assets/css/
    tokens.css              设计变量（配色、字号、间距、圆角、断点宽度）
    base.css                reset、排版、按钮、标签、入场动画、减少动态效果
    sections.css            前台各区块布局与响应式（900px / 560px）
    admin.css               后台样式（1080px / 760px）
  assets/js/
    boot.js                 head 内同步执行，给 <html> 加 .js
    util.js                 共用工具：路径读写、深合并、逐层对比、路径压缩
    content-zh.js / -en.js  内置默认内容（首屏 + 兜底 + 后台的合并基底）
    render.js               列表类内容 → DOM，按 data-list 的值挑渲染器
    content.js              语言选择、合并、刷 DOM、拉后台内容、localStorage 缓存
    main.js                 导航状态、移动端菜单、滚动高亮、入场动画
  assets/admin/
    schema.js               后台字段定义：分区、路径、标签、控件类型
    api.js                  接口封装，统一带 Cookie、统一抛带 status 的错误
    admin.js                编辑器：工作副本、脏路径、保存补丁、历史、导入导出

functions/api/
  content.js                GET 读内容（ETag）/ PUT 写补丁或恢复默认
  login.js logout.js session.js
  revisions.js              历史列表与回滚
  _middleware.js            /api/* 统一出口：HttpError → 状态码，补安全响应头
  _lib/http.js              响应格式、读体、深合并、类型校验、原型污染防护
  _lib/auth.js              密码校验、会话签发与验签、Cookie 构造
  _lib/store.js             D1 读写：upsert 内容、留快照、清理历史、按 id 取版本

schema.sql                  D1 表结构，幂等
wrangler.toml               Pages + D1 绑定的唯一配置来源
.dev.vars.example           本地环境变量模板（.dev.vars 已被忽略）
```

## 4. 硬约束

这些不是偏好，是这个项目成立的前提。改之前先想清楚代价。

- **不引入构建步骤。** 没有打包器、没有编译器、没有 PostCSS。`public/` 里的文件就是上线时的文件。
- **不引入生产依赖，不加 CDN。** 字体走系统字体栈，图标是内联 SVG，缩略图是 CSS 渐变。加一个外链就多一次渲染阻塞和一类可用性风险。
- **不用 `innerHTML` / `insertAdjacentHTML` / `eval` / `new Function`。** 后台的文字全部走 `textContent`。
- **不在客户端用 ES module 或 `import`。** 前台的脚本要能在 `file://` 下直接打开（`content-*.js` 挂在 `window` 上正是为此），模块化会让这条路径失效。
- **密钥不进仓库。** `ADMIN_PASSWORD` / `SESSION_SECRET` 只通过 `.dev.vars`（本地，已忽略）和 Cloudflare 密钥（线上）注入，绝不写进 `wrangler.toml` 或任何 `.js`。
- **不改拷贝。** 两份 `deepMerge` 的流程控制必须一致（客户端返回克隆、服务端返回引用是刻意保留的唯一差异）。改一条规则就同时改两边，并跑 `node .verify.mjs`。
- **不让配置分叉。** `wrangler.toml` 是 Pages 项目配置的唯一来源，用它在控制台改配置是无效操作（字段会变只读）。要改配置就改文件再部署。
- **不绕过接口写库。** 直接改 D1 里的 JSON 会跳过类型校验和原型污染防护；要批量改内容就「导出 JSON → 改文件 → 后台导入」。

## 5. 常见改动怎么做

### 5.1 只改默认文案

改 `public/assets/js/content-zh.js` 和 `content-en.js` 里的**同一个键**。两个文件的键结构必须逐层一致，`node .verify.mjs` 会检查（不一致时切语言会缺字段）。日常改信息用后台就够，不用碰这两个文件。

### 5.2 新增一个可编辑字段

按顺序做三件事，缺一步字段就是坏的：

1. **加默认值**：`content-zh.js` 与 `content-en.js` 在同一个父路径下加同名键。
2. **让页面用它**：
   - 标量（文字、链接、无障碍提示）→ 在 `public/index.html` 加标记：`data-i18n="path"` 改文本，`data-i18n-href="path"` 之类改属性（属性白名单只有 `href` / `content` / `aria-label` / `title` / `alt` / `src`，需要别的得先加进 `content.js` 的 `I18N_ATTRIBUTES`）。
   - 列表 → 加 `data-list="path"` 挂载点，并在 `render.js` 的 `renderers` 里注册渲染器（见 5.4）。
   - `data-i18n` 只能放在叶子节点上，否则会把子元素一起抹掉。
3. **让后台能改**：在 `schema.js` 对应分区的 `fields` 里加一条。标量用 `field(path, 标签, 类型, 提示)`（类型是 `text` / `textarea` / `url`）；字符串数组用 `type: "list"`；对象数组用 `type: "cards"` 加 `itemTitle` 和内部 `inner(...)` 字段（内部字段写相对路径）。

验证方式：`node .verify.mjs` → `npm run dev` → 打开 `/admin` 确认字段出现、改一下保存 → 刷新站点看到变化。路径写错不会报错，只是这个字段在后台不可见；保存后的 `diffPaths` 自检能间接发现字段定义和内容包对不上。

### 5.3 新增列表渲染器

在 `render.js` 的 `renderers` 对象里加一个键，键名就是内容里的点号路径，然后在 `index.html` 里给容器加 `data-list="同一个路径"`。渲染函数拿到的是这个路径上的值，必须是数组；元素一律用 `el(tag, className, text)` 或 `createElement` 构建。返回值不用管，`renderAll` 会在每次 `apply()` 时把挂载点清空重画。

### 5.4 新增一个接口

在 `functions/api/` 下加文件，按方法导出 `onRequestGet` / `onRequestPut` / `onRequestPost`（Pages Functions 的约定）。三条规则：

- 读体用 `readJson(request)`（含 256KB 上限），返回用 `json(payload)`。
- 出错就 `throw new HttpError(status, "给用户看的中文原因")`，`_middleware.js` 会翻成对应状态码；不要自己拼 `Response`。
- 写操作第一行必须 `await requireSession(env, request)`。

不要忘记 `_middleware.js` 已经统一补了 `X-Content-Type-Options` / `Referrer-Policy` / `X-Robots-Tag`，不用在每个接口里重复写。`public/_routes.json` 只放行 `/api/*`，新接口只要放在这个目录下就会自动生效。

### 5.5 改配色与间距

只改 `tokens.css`。`base.css` / `sections.css` / `admin.css` 里不写死颜色和间距数值，都用 `var(--*)`。需要新的断点时优先用 `clamp()` 做流体缩放，只有布局真的换形态时才加媒体查询。

### 5.6 加一种语言

语言列表硬编码在多处，加语言要一起改（目前只支持 `zh` / `en`）：

1. 新建 `public/assets/js/content-XX.js`（照抄 `content-zh.js` 的结构）。
2. `content.js`：`LOCALES`、`HTML_LANG`、`OG_LOCALE`。
3. `public/index.html` 与 `public/admin/index.html` 各加一条 `<script>`。
4. `schema.js`：`locales` 数组。
5. `functions/api/content.js` 与 `functions/api/revisions.js`：`LOCALES` 数组（不支持的语言会返回 400）。
6. `README.md` 的接口表与后台说明里提到语言的段落。

## 6. 内容字段速查

顶层 13 个键，对应后台 11 个分区。这份表是「路径 → 形态」的权威索引，新增字段时照它对齐。

| 顶层键 | 后台分区 | 路径与形态 |
| --- | --- | --- |
| `meta` | 页面信息 | `title`、`description`（标量） |
| `site` | 页面信息 | `url`（标量，写进 `og:url` 和 ld+json） |
| `a11y` | 页面信息 | `skip`（跳转正文链接的文字） |
| `nav` | 导航栏 | `brand`、`label`、`about`、`skills`、`projects`、`experience`、`contact`、`menu`、`langSwitch`（全为标量） |
| `links` | 链接与社交 | `resume`（文件名，留空则隐藏按钮）、`email`（带 `mailto:`）、`github`、`linkedin`、`x`、`socialLabel`、`githubLabel`、`linkedinLabel`、`xLabel`、`emailLabel` |
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

改完按这个顺序过一遍，前面过了再做后面：

```bash
node .verify.mjs    # 逻辑层：合并语义、补丁往返、鉴权、存储层 SQL、类型保护
npm run dev         # 另开一个终端
node .e2e.mjs       # 接口层：状态码、Cookie 属性、缓存协商、历史回滚
```

`413` / `429` / `500` / `503` 这四条路径脚本里没有断言（分别要构造超大体、连打 8 次失败登录、制造故障），改动 `readJson`、`login.js`、`store.js`、`_middleware.js` 时要手工验证。

改完后还要在浏览器里手过一遍真实链路：`/admin` 登录 → 改一个标量字段 → 改一个列表（增删 + 排序）→ 保存 → 刷新站点确认 → 「恢复」回到上一版 → 切语言确认另一份没被影响。

## 8. 部署与配置

首次部署的完整步骤在 [README.md](./README.md)（登录 Cloudflare、建库、填 `database_id`、建表、建项目、写两个密钥、部署、自检）。这里只列容易踩的点：

- `wrangler.toml` 里的 `database_id` 现在是全 0 占位符，不换掉后台会一直报「D1 未绑定」。
- 用 `wrangler.toml` 部署过之后，控制台里对应的绑定字段变只读；要改配置就改文件再部署。
- 本地是 http，会话 Cookie 不带 `Secure`；线上是 https，带 `Secure`。这个条件在 `auth.js` 的 `isSecureRequest` 里判断，不要写死。
- 只改密钥也要重新部署一次（`SESSION_SECRET` 一变，旧的后台登录 Cookie 全部失效）。
- 上线后第一件事是在后台把「站点地址」改成正式域名，它会写进 `og:url` 和 ld+json。
- Git 集成的预览部署需要单独的 `[env.preview]` 绑定，否则预览域名上的后台读不到 D1。
- **接了 Git 集成时，构建设置里的 Deploy command 要么留空，要么填 `npx wrangler pages deploy`；填 `wrangler deploy` 必错。** `wrangler deploy` 是 Workers 的命令：它会先警告「它是一个 Pages 项目」，再报 `Missing entry-point to Worker script or to assets directory`，一个文件都不会上传。别为了让它通过就把 `pages_build_output_dir` 改成 Workers 的 `main` / `assets`——`functions/`（含 `_middleware.js`、`_routes.json` 的 `/api/*` 白名单）是 Pages 专有的，wrangler 自己的 autoconfig 也把 `cloudflare-pages` 标成 `supported: false`（源码注释：Autoconfiguring a Pages project into a Workers one is not yet supported）。迁移等于重写整层接口并引入构建步骤，和 §4 的两条硬约束直接冲突。

## 9. 已知坑

| 坑 | 说明 |
| --- | --- |
| 数组是整体替换 | 后台里改数组任何一项都会把整个数组标脏并发出去。只发数组中的一项会被深合并当成对象，结果不是想要的。 |
| D1 里只有改动 | 库里的 `{"hero":{"name":"…"}}` 缺 `hero.role` 是正常的，缺的字段由内置默认值补齐。这是设计，不是数据损坏。 |
| 最新一条历史 = 当前内容 | 保存时留的快照是「写入后的内容」，所以历史列表第一条和现在一样，回滚它是空操作。「恢复默认」留的则是被删掉的那份。 |
| 限流只作用于单个 isolate | Workers 的模块级变量不跨 isolate，同一 IP 命中不同实例时计数不共享。它只挡脚本化暴力尝试。 |
| 首屏语言可能闪一下 | HTML 里是中文，英文访客要等 JS 跑完才切成英文。换取的是「不依赖 JS 也能看到完整内容」。 |
| 内容有一层 localStorage 缓存 | 接口不通时用上次的内容兜底，所以线上改完偶尔要硬刷新。键名 `site:content:v1` 带版本号，内容形状变了就改版本号。 |
| 简历 PDF、头像不在后台管理范围 | 后台只改文字和链接。文件要自己放进 `public/` 再部署；文件名留空会让按钮隐藏而不是留一条死链。 |
| `og:` 与 ld+json 是两份 | HTML 里那份是给不跑 JS 的爬虫的兜底，页面加载后再用当前语言的内容覆盖一次。 |
| 前台脚本不能在 `file://` 下 fetch | `content.js` 检测到协议不是 http(s) 就跳过请求，直接用缓存或默认值。本地调试接口一定要用 `npm run dev`。 |

## 10. 文档索引

| 文件 | 内容 |
| --- | --- |
| [README.md](./README.md) | 面向使用者：目录结构、本地跑起来、部署步骤、上线前要替换的占位内容 |
| [docs/PRD.md](./docs/PRD.md) | 需求：目标与非目标、用户故事、功能需求、非功能需求、验收清单、风险 |
| [docs/TECH_DESIGN.md](./docs/TECH_DESIGN.md) | 设计：技术选型、模块职责、运行时流程、数据模型、合并语义、接口契约、安全设计、测试策略 |
| [AGENTS.md](./AGENTS.md) | 本文件：仓库约定、改动落点、字段速查、验证顺序、已知坑 |

改了代码里的约定（合并规则、接口契约、字段形态、部署方式）就顺手更新对应文档，别让文档和实现对不上。
