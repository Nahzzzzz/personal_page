# 个人主页 技术设计

> 对应 PRD v1.0 · 最后更新 2026-10-16
> 需求背景与功能范围见 [PRD.md](./PRD.md)，仓库约定与操作手册见 [../AGENTS.md](../AGENTS.md)。

## 1. 系统概览

```
                        ┌─────────────────────────────────────────┐
   访客浏览器 ──────────►│  Cloudflare Pages（静态资源）            │
                        │  public/index.html + assets/            │
                        └───────────────┬─────────────────────────┘
                                        │ 只有 /api/* 会进 Functions
                                        │ （由 public/_routes.json 收窄）
                        ┌───────────────▼─────────────────────────┐
   主人浏览器 ──────────►│  Pages Functions  functions/api/*       │
   （/admin）            │  content · login · logout · session      │
                        │  revisions · _middleware（错误与响应头）  │
                        └───────────────┬─────────────────────────┘
                                        │ env.DB
                        ┌───────────────▼─────────────────────────┐
                        │  D1（SQLite）                            │
                        │  content  ：每种语言一行，存改动过的字段  │
                        │  revisions：每次写入前的快照，每语言 20 份│
                        └─────────────────────────────────────────┘
```

三条不变量支撑了整个设计：

1. **D1 是唯一真相**，内置默认值只是兜底。前台、后台、接口都按同一套「默认值 + D1 改动」的规则算出最终内容。
2. **内容改动是稀疏补丁**。写入只发改过的字段，读取只读需要的部分，合并规则统一为深合并（数组整体替换）。
3. **站点在没有后端的情况下也完整可用**。所有内容都有代码里的默认值，接口失败时降级而不是白屏。

## 2. 技术选型

| 选择 | 理由 | 代价 |
| --- | --- | --- |
| 原生 HTML / CSS / JS，零构建 | 改一行就能看效果，不需要装工具链；十年后还能打开 | 没有类型检查、组件复用靠手写；i18n 与字段定义的一致性靠测试脚本保证 |
| Cloudflare Pages + Functions | 静态资源和接口一个项目、一次部署；免费额度对个人站足够 | 与 Cloudflare 绑定，迁移要重写 Functions |
| D1 而非 KV | 需要「按语言查一行」「按 id 取历史」「倒序取最近 N 条」这类关系型操作 | 冷启动和跨区延迟高于 KV（对个人站可忽略） |
| 无框架 | 页面是纯展示 + 一个表单页，引入框架的收益低于成本 | 后台表单要靠 `schema.js` + `admin.js` 手写生成逻辑 |
| 无状态会话（签名 Cookie） | 不引入 session 表，不改动数据库就能扩容 | 无法服务端主动吊销单个会话 |
| 系统字体栈 | 省掉一次渲染阻塞请求；中英文都能落到合适的字体 | 不同系统观感略有差异 |

依赖清单：生产依赖 **0 个**，开发依赖只有 `wrangler` 一个。

## 3. 模块职责

| 文件 | 层 | 职责 |
| --- | --- | --- |
| `public/assets/css/tokens.css` | 前台 + 后台 | 设计变量：配色、字号、间距、圆角、布局宽度（只有深色一套） |
| `public/assets/css/base.css` | 前台 + 后台 | reset、排版基线、按钮、标签、入场动画、`prefers-reduced-motion` |
| `public/assets/css/sections.css` | 前台 | 各区块布局与响应式（900px / 560px 两个断点） |
| `public/assets/css/admin.css` | 后台 | 登录门、顶栏、侧边栏、表单、历史栏（1080px / 760px 两个断点） |
| `public/index.html` | 前台 | 页面骨架、`data-i18n` 标记、`data-list` 挂载点、结构化数据兜底 |
| `public/assets/js/boot.js` | 前台 | head 内同步执行，给 `<html>` 加 `.js`，让入场动画只在脚本可用时生效 |
| `public/assets/js/util.js` | 共用 | 点号路径读写、深合并、逐层对比、路径压缩。**前后台共用同一份语义** |
| `public/assets/js/content-zh.js` / `content-en.js` | 前台 | 内置默认内容（首屏兜底 + 合并基底 + 后台的默认值来源） |
| `public/assets/js/render.js` | 前台 | 把列表类内容渲染成 DOM：段落、事实清单、技能分组、项目卡片、经历时间线 |
| `public/assets/js/content.js` | 前台 | 语言选择、内容合并、刷到 DOM、拉取后台内容、`localStorage` 缓存 |
| `public/assets/js/main.js` | 前台 | 导航滚动状态、移动端菜单、滚动高亮、入场动画、页脚年份 |
| `public/admin/index.html` | 后台 | 登录门 + 编辑器外壳（顶栏、侧边栏、表单容器、历史栏） |
| `public/assets/admin/schema.js` | 后台 | 表单字段定义：分区、字段路径、标签、控件类型、提示文案 |
| `public/assets/admin/api.js` | 后台 | 接口封装，统一带 Cookie、统一抛带 `status` 的错误 |
| `public/assets/admin/admin.js` | 后台 | 编辑器状态机：工作副本、脏路径、保存补丁、历史、导入导出 |
| `functions/api/content.js` | 服务端 | `GET` 读内容（ETag 协商缓存）、`PUT` 写补丁或恢复默认 |
| `functions/api/login.js` / `logout.js` / `session.js` | 服务端 | 登录（含尽力而为的失败限流）、登出、登录态查询 |
| `functions/api/revisions.js` | 服务端 | 历史版本列表与回滚 |
| `functions/api/_lib/http.js` | 服务端 | 响应格式、请求体解析、深合并、类型一致性校验、原型污染防护 |
| `functions/api/_lib/auth.js` | 服务端 | 密码校验、会话签发与验签、Cookie 构造 |
| `functions/api/_lib/store.js` | 服务端 | D1 读写：内容 upsert、快照、保留策略、按 id 取历史 |
| `functions/api/_middleware.js` | 服务端 | `/api/*` 的统一出口：错误翻译成状态码、补安全响应头 |
| `schema.sql` | 基础设施 | D1 表结构，幂等，可重复执行 |
| `wrangler.toml` | 基础设施 | Pages + Functions + D1 绑定的唯一配置来源 |

## 4. 运行时流程

### 4.1 前台加载

```
HTML 解析（中文默认内容已经在 DOM 里，可立即阅读）
  ├─ head: boot.js 同步执行 → <html class="js">
  └─ body 末尾（全部 defer，按顺序执行）
       util.js → content-zh.js → content-en.js → render.js → content.js → main.js
                                                                  │
                                          content.js: start()
                                            ① apply()   用内置默认值同步渲染首屏
                                            ② bindToggle() 绑定语言按钮
                                            ③ loadRemote() 异步 fetch /api/content
                                                     │ 成功：合并 → 写 localStorage → 再 apply 一次
                                                     └ 失败：读 localStorage 缓存 → apply；再失败保持默认
```

要点：

- **首屏不等待网络**。先用默认值画出来，后台内容到了再整体重绘，避免白屏。
- **`file://` 直接打开也能用**。`content.js` 检测到协议不是 http(s) 就跳过 `fetch`，只用缓存或默认值。
- 每次 `apply()` 结束都会派发 `site:content` 事件，后续要挂载额外逻辑可以从这里订阅。

### 4.2 后台加载

```
/admin 打开
  └─ admin.js: boot()
       cacheDom() → bind() → GET /api/session
             ├─ authenticated=false → 显示登录门（未配 ADMIN_PASSWORD 时给出明确提示）
             └─ authenticated=true  → startStudio()
                    GET /api/content
                    对每种语言：state.working[locale] = deepMerge(内置默认值, D1 内容)
                    渲染语言标签 → 渲染当前分区表单 → 同步顶栏状态 → 拉历史
```

`working` 是可编辑副本，改动只写进它，点保存才把「脏路径」拼成补丁发出去。这样保存前可以随意改、随时放弃。

### 4.3 保存

```
点击保存
  ├─ 收集每种语言的脏路径集合
  ├─ shallowestPaths()：`about.facts` 已在集合里时，丢掉 `about.facts.0.value`
  ├─ 逐语言 PUT /api/content {locale, patch}
  │     服务端：requireSession → 解析体 → 校验 locale → assertSafePayload
  │             → 读存量 → assertKindConsistent → deepMerge → 体积检查
  │             → D1 batch（upsert content + insert revisions + 清理超出 20 条的历史）
  │     返回合并后的完整内容
  └─ acceptStored()：working = deepMerge(默认值, 返回内容)，清空脏标记
         └─ diffPaths(预期, 实际)：不一致说明字段定义和内容包对不上，明确提示
```

单个数组里任何一项的改动都会把**整个数组**标脏，因为服务端是数组整体替换语义：只发数组中的一项会被当成对象合并，结果不是用户想要的。

### 4.4 语言切换与语言包标记

页面文字不写死在 JS 里，靠两类标记识别：

| 标记 | 作用 | 例 |
| --- | --- | --- |
| `data-i18n="path"` | 覆盖元素的 `textContent`（元素必须是叶子节点，否则会把子元素一起抹掉） | `<h2 data-i18n="about.title">` |
| `data-i18n-<attr>="path"` | 把值写到对应属性，属性名走白名单 | `data-i18n-href="links.resume"` |

属性白名单为 `href` / `content` / `aria-label` / `title` / `alt` / `src`，用固定选择器一次性取节点，避免遍历全部元素的属性（当前页面用到的是前四个）。取不到值时控制台按 key 去重后告警一次。列表类内容不走标记，由 `render.js` 按 `data-list` 渲染，所以后台文字里带 `<` 或 `>` 也不会变成标签。

## 5. 数据模型

### 5.1 D1 表

```sql
CREATE TABLE content (
  locale     TEXT PRIMARY KEY,  -- 'zh' | 'en'
  data       TEXT NOT NULL,     -- 稀疏内容（JSON 字符串），只含改过的字段
  updated_at TEXT NOT NULL      -- ISO 8601，同时用作读接口的 ETag
);

CREATE TABLE revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  locale     TEXT NOT NULL,
  data       TEXT NOT NULL,     -- 每次写入留下的快照，形状与 content.data 相同
  created_at TEXT NOT NULL
);

CREATE INDEX revisions_locale_id ON revisions (locale, id DESC);
```

`content.data` 存的是**历次补丁累积后的稀疏对象，不含内置默认值**：你只改过 `hero.name`，这一行就是 `{"hero":{"name":"…"}}`，`hero.role` 这一层根本不在库里。合并发生在读取之后——前台和后台各自把它叠到 `content-*.js` 的默认值上。`.e2e.mjs` 里有一条断言专门钉住这件事（写入 `hero.name` 后 `hero.role` 必须还是 `undefined`）。

由此推出的两个后果：

- **导出的是稀疏内容，不是页面全文。** 「导出全部内容」下载的 JSON 要配合同一版本的语言包才能还原页面。
- **不能直接改库里的 JSON。** 绕过接口写入会把类型保护跳过，坏结构只能靠前台的合并兜底。

`revisions.data` 的形状和 `content.data` 相同（同样是稀疏对象，因为回滚时还要按「默认值 + 改动」解释），但两者的取值时机不同：

| 写入路径 | 快照内容 | 后果 |
| --- | --- | --- |
| `writeLocale`（保存 / 回滚） | **本次写入后的内容** | 历史列表第一条就等于当前内容，回滚到它等于没改 |
| `deleteLocale`（恢复默认） | **被删掉的那份内容** | 恢复默认后能靠这条历史找回来 |

历史保留策略在 `store.js`：

```16:16:functions/api/_lib/store.js
const KEEP_REVISIONS = 20;
```

写入用 `db.batch([...])`，D1 会把一个 batch 当作事务执行，所以「写内容」和「留快照」不会出现只成功一半的情况。

### 5.2 内容对象形状

顶层 13 个键，对应后台 11 个分区：

| 顶层键 | 后台分区 | 形态 |
| --- | --- | --- |
| `meta`、`site`、`a11y` | 页面信息 | 标量 |
| `nav` | 导航栏 | 标量 |
| `links` | 链接与社交 | 标量（含 `mailto:` 链接和简历文件名） |
| `hero` | 首屏 | 标量 |
| `terminal` | 首屏终端卡片 | 标量 |
| `about` | 关于我 | 标量 + `paragraphs`（字符串数组）+ `facts`（对象数组） |
| `skills` | 技能 | 标量 + `groups`（对象数组，内含字符串数组 `items`） |
| `projects` | 项目 | 标量 + `items`（对象数组，内含字符串数组 `stack`） |
| `experience` | 工作经历 | 标量 + `items`（对象数组，内含字符串数组 `points`） |
| `contact` | 联系 | 标量 |
| `footer` | 页脚 | 标量 |

列表类内容没有写在 HTML 里，而是由 `render.js` 按 `data-list="<路径>"` 挂载点生成：`about.paragraphs`、`about.facts`、`skills.groups`、`projects.items`、`experience.items`。

## 6. 合并语义（核心不变量）

前台与后台必须对「覆盖」有一致的理解，否则会出现「后台显示 A、页面显示 B」。规则是三条：

1. **数组整体替换**。列表的增删和顺序完全由覆盖方决定，不做逐项合并。
2. **同类才覆盖**。默认值里已经存在的路径只接受同一「种类」（对象 / 数组 / 标量）的覆盖；类型不符就当作没改过，保留默认值。
3. **默认值里没有的键可以自由写入**。这样内容包可以慢慢补字段，不会因为先后顺序互相阻塞。

这三条在客户端只兜底，服务端在写入前就会拦：

| 层 | 位置 | 作用 |
| --- | --- | --- |
| ① 客户端合并 | `public/assets/js/util.js` `deepMerge` | D1 里万一有脏数据，页面退回默认值而不是渲染出坏结构 |
| ② 服务端写入校验 | `functions/api/_lib/http.js` `assertKindConsistent` | 类型不符的覆盖直接 400，并指出具体路径 |
| ③ 保存后自检 | `public/assets/admin/admin.js` `diffPaths` | 合并后读回的内容与本地预期不一致时明确报错，说明字段定义和内容包对不上 |

### 为什么有两份 `deepMerge`

浏览器的脚本是「无模块系统的 IIFE + 全局变量」，Functions 是 ESM，两者不能直接共享一个文件——共享的前提是引入构建步骤，而零构建是这个项目的硬约束。所以两份实现并存，靠三条保证不跑偏：

1. 两份的注释里都写明「和另一侧保持同一套语义」；
2. 服务端的 `assertKindConsistent` 是二次防线，即使合并实现有细微出入也不会把坏结构写进页面；
3. `.verify.mjs` 用同一组用例驱动两侧，任何一侧改动都会被测出来。

唯一的实现差异是克隆：客户端返回全新对象（避免污染内置默认值），服务端返回引用（请求作用域内用完即弃）。

## 7. 接口契约

所有接口都在 `/api/*` 下，统一 JSON，统一带 `X-Content-Type-Options: nosniff` 和 `X-Robots-Tag: noindex`。

| 方法 | 路径 | 鉴权 | 请求 | 成功响应 |
| --- | --- | --- | --- | --- |
| GET | `/api/content` | 公开 | – | `{content: {zh?, en?}, updatedAt}` |
| PUT | `/api/content` | 需登录 | `{locale, patch}` 或 `{locale, reset: true}` | `{ok, locale, updatedAt, content}` / `{ok, locale, reset, removed}` |
| GET | `/api/session` | 公开 | – | `{authenticated, expiresAt, configured}` |
| POST | `/api/login` | 公开 | `{password}` | `{ok, expiresAt}` + `Set-Cookie` |
| POST | `/api/logout` | 公开 | – | `{ok}` + 让 Cookie 立即过期的 `Set-Cookie` |
| GET | `/api/revisions?locale=zh` | 需登录 | – | `{locale, revisions: [{id, createdAt, size}]}` |
| POST | `/api/revisions` | 需登录 | `{id}` | `{ok, locale, updatedAt, restoredFrom, content}` |

错误响应统一为 `{error: "人话错误信息"}`，部分带 `detail`：

| 状态码 | 触发条件 |
| --- | --- |
| 400 | 请求体不是合法 JSON、空补丁、locale 不支持、类型不一致、字段名含 `__proto__` 等 |
| 401 | 未登录或会话过期；密码错误 |
| 404 | 历史版本 id 不存在 |
| 413 | 请求体超过 256KB，或合并后内容超过 200KB |
| 429 | 同一 IP 10 分钟内登录失败超过 8 次 |
| 500 | 未预期异常，堆栈只进函数日志，不回给客户端 |
| 503 | 未绑定 D1（`database_id` 没填或填错） |

### 缓存

| 接口 | 策略 |
| --- | --- |
| `GET /api/content` | `Cache-Control: no-cache` + `ETag: "<updatedAt>"`；带 `If-None-Match` 且命中时返回 304，不重传内容 |
| 其余接口 | `Cache-Control: no-store`（`json()` 的默认值），因为内容随时会变，缓存收益低于不一致风险 |

前台的第二层缓存是 `localStorage['site:content:v1']`：接口通就用新数据覆盖它，接口不通就用它顶上。键名带版本号，内容形状变化时改版本号即可让旧缓存自然失效。

## 8. 鉴权与会话

```
登录：POST /api/login {password}
  ├─ tooManyAttempts(ip) → 429（尽力而为，见下）
  ├─ verifyPassword：双方各自 HMAC 摘要后等长比较，长度不等也走完循环
  └─ 成功：Set-Cookie site_admin=<expiresAt>.<HMAC("v1|expiresAt")>
           HttpOnly; SameSite=Strict; Path=/; Max-Age=604800(7天)（https 下额外加 Secure）

鉴权：requireSession → 解析 Cookie → 检查过期 → 重算 HMAC 并等长比较
```

设计要点：

- **服务端不存会话**。Cookie 里只有过期时间和签名，验签通过即认为登录有效。数据库里没有 session 表，也没有任何用户记录。
- **密码不落库**。`ADMIN_PASSWORD` 只在 Cloudflare 密钥里，比较前先各自摘要，避免用长度或耗时差异探测。
- **签名密钥回退**。`SESSION_SECRET` 没配时退回用 `ADMIN_PASSWORD` 签名；改任一密钥都会让所有旧会话失效。
- **本地 http 不加 `Secure`**。否则浏览器会直接丢掉这个 Cookie，本地永远登不上。

### 限流的能力边界

登录失败计数放在 Workers 的模块级 `Map` 里。模块级变量只活在单个 isolate 内，同一 IP 命中不同 isolate 时计数不共享，所以它只能挡住脚本化的暴力尝试，不是可靠的分布式限流。要更严就得引 Durable Object、Cloudflare Rate Limiting 规则，或者给路径套 Cloudflare Access。

## 9. 安全设计

| 面 | 措施 |
| --- | --- |
| 内容注入 | 页面所有来自后台的文字都用 `createElement` + `textContent` 构建，全仓库没有 `innerHTML`；`projects.items` 里的链接在渲染前会跳过长/空值 |
| 原型污染 | `assertSafePayload` 递归拒绝 `__proto__` / `constructor` / `prototype` 字段名，在合并之前整体拒掉 |
| 类型破坏 | `assertKindConsistent` 保证补丁不改变已有路径的「种类」，避免一个字符串把整个区块覆盖成空 |
| 体积 | 请求体 256KB（`readJson` 同时看 `content-length` 和实际长度）、单语言内容 200KB |
| 会话窃取 | `HttpOnly`（JS 读不到）+ `SameSite=Strict`（跨站请求不带）+ https 下 `Secure` |
| 点击劫持 | 静态资源侧 `X-Frame-Options: DENY` |
| 收录 | `/admin` 页面 `meta robots: noindex`、`robots.txt` 屏蔽 `/admin` 与 `/api`、接口响应带 `X-Robots-Tag: noindex` |
| 攻击面收敛 | `_routes.json` 只把 `/api/*` 交给 Functions，其余请求全部由静态资源直接响应，函数不会被任意路径触发 |
| 信息泄漏 | 500 只返回「服务器内部错误，详情见函数日志」，堆栈留在 `console.error` |
| 引用来源 | 静态资源 `Referrer-Policy: strict-origin-when-cross-origin`，接口响应 `no-referrer` |

**尚未覆盖**：数据库备份自动化、后台访问审计、双因素认证、Cloudflare Access。这些都在 PRD 的风险章节里作为已知取舍列出。

## 10. 部署拓扑

```
本地                                    线上
─────────────────────────────           ─────────────────────────────
wrangler pages dev                      wrangler pages deploy
pages_build_output_dir = public   ──►   Pages：静态资源 + Functions
.env 本地 D1 状态在 .wrangler/state ──►  D1：site-content（database_id 绑定为 env.DB）
.dev.vars 提供 ADMIN_PASSWORD     ──►   Cloudflare 密钥（不写进 wrangler.toml）
                                 ──►   Cloudflare 自定义域名（可选）
```

配置来源与顺序：

1. `wrangler.toml` 是 Pages 项目配置的唯一来源（`name`、`compatibility_date`、`pages_build_output_dir`、D1 绑定）。用它部署过之后，控制台里对应字段变为只读。
2. 密钥单独管理：`wrangler pages secret put` 或控制台，不进仓库、不进 `wrangler.toml`。
3. 本地开发用 `.dev.vars`（已 gitignore），模板见 `.dev.vars.example`。

部署后的自检：`GET /api/session` 应返回 `configured: true`；`GET /api/content` 应返回 `{"content":{},"updatedAt":null}`，若返回 503 且提示「D1 未绑定」说明绑定没生效。

## 11. 可观测性

| 手段 | 用途 |
| --- | --- |
| `npm run tail` | 实时看线上 Functions 日志 |
| `console.error("[store] …")` | 内容不是合法 JSON 等数据层异常 |
| `console.error("[api] METHOD PATH …")` | 未预期异常，带请求方法与路径 |
| `console.warn("[content] 缺少文案…")` | 前台找不到 i18n 键，按 key 去重 |
| `console.info("[content] 未能取到后台内容…")` | 降级到默认值或缓存 |
| `GET /api/session`、`GET /api/content` | 部署后的健康检查入口 |

没有引入第三方监控：个人站的流量下，`wrangler tail` 加 Cloudflare 自带的请求分析够用。

## 12. 测试策略

本地两个脚本都是无依赖的 Node ESM，直接 `node xxx.mjs` 跑。它们被 `.gitignore` 忽略，属于开发机上的工具。

| 脚本 | 需要服务 | 覆盖内容 |
| --- | --- | --- |
| `.verify.mjs` | 否 | 纯逻辑：路径读写（含数字下标补数组）、深合并（数组替换、不改入参）、路径压缩、中英内容包结构一致性、补丁往返等价、原型污染拦截、鉴权（签名/过期/换密钥/篡改/`Secure` 条件）、存储层的 SQL 与绑定值、三层类型保护 |
| `.e2e.mjs` | 是（`npm run dev`） | 打真实 Functions + 本地 D1：清库 → 公开读取 → 鉴权（未登录写入/看历史被拒、错误密码被拒、Cookie 属性）→ 写入与类型拒绝 → 原型污染 → 缓存协商（ETag/304）→ 历史与恢复 → 恢复默认 → 登出 → 收尾清库 |

两个脚本的状态码覆盖情况：`200` / `304` / `400` / `401` / `404` 有断言；`413` / `429` / `500` / `503` 没有——`429` 要连打 8 次失败登录、`413` 要构造超大体、`500` 和 `503` 要制造故障，目前靠手工验证。改这两段代码时要手动过一遍。

两个使用上的注意点：

- **`.e2e.mjs` 里硬编码了本地开发密码**，必须和 `.dev.vars` 中的 `ADMIN_PASSWORD` 一致，否则第一步登录就失败。换密码时两个地方一起改。
- **`.e2e.mjs` 会把本地 `content` 表里两种语言的内容全部清空**（开头和结尾各一次）。它只动 `.wrangler/state` 里的本地数据，不碰线上。

两个设计选择值得说明：

- **用 `node:vm` 把浏览器脚本装进假 `window` 里跑**。这样前台真正用到的那份 `util.js` 和内容包能在无浏览器环境里被测，避免「测试里复制一份实现」这种自欺欺人的写法。
- **`.e2e.mjs` 自己负责收尾**。跑完会把两种语言的内容和快照清掉，所以可以反复执行，不会污染本地开发状态。

每次改动的验证顺序：`node .verify.mjs` → `node .e2e.mjs` → 浏览器里手测一遍保存链路。

## 13. 已知问题与取舍

| 问题 | 现状 | 后续可能 |
| --- | --- | --- |
| 首屏语言闪烁 | 内置内容是中文，英文用户首次进入会看到一瞬间中文 | 换取「不依赖 JS 也能看到完整内容」，暂不改 |
| 字段定义与内容包靠人工对齐 | `schema.js` 的路径写错不会报错，只是这个字段在后台不可见 | 保存后的 `diffPaths` 自检能间接发现；也可加一个启动期校验 |
| 历史只保留 20 份 | 超出自动删除，删掉就找不回 | 定期「导出全部内容」留档 |
| 限流只作用于单 isolate | 见 8 节 | 加 Cloudflare Access 或 Rate Limiting 规则 |
| 图片与附件不能后台上传 | 简历 PDF 要手动放进 `public/` 再部署 | 引入 R2 + 上传接口 |
| 内容只有一份线上数据 | 误删数据库会丢后台内容（默认值在代码里，站不会崩） | 导出 JSON 作为备份 |
| 中英内容分两次请求保存 | 保存是逐语言串行 PUT，第二种语言失败时第一种已经生效 | 目前可接受；要原子化需要服务端支持多语言单次写入 |
