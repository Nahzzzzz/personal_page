# 个人主页

纯 HTML、CSS 和原生 JavaScript 写的单页个人主页，带一个可视化内容后台：改姓名、简介、项目、联系方式这些信息不用动代码，在 `/admin` 里改完保存，刷新页面就生效。

前台是静态文件，后台跑在 Cloudflare Pages Functions 上，改过的内容存在 D1（Cloudflare 的 SQLite 数据库）里。

```
浏览器 ──► Cloudflare Pages（静态文件）
              └─► /api/content（Pages Functions）──► D1
```

## 目录结构

```
.
├── public/                         只有这个目录会被上传到 Cloudflare
│   ├── index.html                  页面结构（中文为默认语言，直接写在 HTML 里）
│   ├── favicon.svg
│   ├── robots.txt                  屏蔽 /admin 和 /api
│   ├── _headers                    Cloudflare Pages 自定义响应头
│   ├── _routes.json                只让 /api/* 走 Functions
│   ├── admin/index.html            后台页面
│   └── assets/
│       ├── css/
│       │   ├── tokens.css          设计变量（配色、字号、间距）
│       │   ├── base.css            reset、排版、按钮、标签、入场动画
│       │   ├── sections.css        各区块布局与响应式
│       │   └── admin.css           后台专用样式
│       ├── js/
│       │   ├── util.js             路径取值/赋值、深合并、逐层对比（前台后台共用）
│       │   ├── content-zh.js       中文内置内容（首屏兜底 + 默认值）
│       │   ├── content-en.js       英文内置内容
│       │   ├── render.js           把列表类内容渲染成 DOM
│       │   ├── content.js          取后台内容并刷到页面上、语言切换
│       │   ├── boot.js             head 里同步执行，给 html 加 .js
│       │   └── main.js             导航、移动端菜单、滚动高亮、入场动画
│       └── admin/
│           ├── schema.js           后台表单的字段定义
│           ├── api.js              后台接口封装
│           └── admin.js            后台编辑器
├── functions/api/                  Pages Functions，部署后就是 /api/*
│   ├── _middleware.js              统一错误处理与安全响应头
│   ├── content.js                  GET 读内容 / PUT 存内容
│   ├── login.js  logout.js  session.js
│   ├── revisions.js                历史版本列表与回滚
│   └── _lib/
│       ├── auth.js                 密码校验、会话 Cookie 签名
│       ├── http.js                 响应格式、深合并、请求校验
│       └── store.js                D1 读写
├── schema.sql                      D1 表结构
├── wrangler.toml                   Pages + D1 配置
├── .dev.vars.example               本地环境变量模板
└── package.json
```

零构建、零依赖、零外部请求。站点只用系统字体，没有 CDN，也没有打包步骤。

## 本地跑起来

```bash
npm install

# 1. 建本地数据库表（数据落在 .wrangler/state，已被 .gitignore 忽略）
npm run db:init

# 2. 准备本地环境变量
copy .dev.vars.example .dev.vars     # macOS / Linux 用 cp
# 打开 .dev.vars，把 ADMIN_PASSWORD 改成你自己想用的密码

# 3. 起本地服务
npm run dev
```

然后：

- 站点 <http://localhost:8788>
- 后台 <http://localhost:8788/admin>

前台页面也能直接双击 `public/index.html` 打开，只是这种方式取不到 `/api/content`，页面会显示 `content-zh.js` 里的内置内容。

## 内容是怎么组织的

记住一条就够：**页面上显示的内容 = 内置默认值 + 后台保存的内容**。

| | 存在哪 | 作用 |
| --- | --- | --- |
| 内置默认值 | `public/assets/js/content-zh.js`、`content-en.js` | 首屏兜底；后台挂了、接口没通、直接用 `file://` 打开时页面也完整 |
| 后台内容 | D1 的 `content` 表，每种语言一行 | 在 `/admin` 里改过的字段 |

几条由此推出的规则：

- **D1 里只存改过的字段。** 你在后台只改了姓名，库里就只有 `{"hero":{"name":"…"}}`，不是整份内容。前台读到之后跟内置默认值合并，得到完整页面。
- **数组整体替换。** 项目列表、技能分组、经历这些都是「发什么就是什么」，不做逐项合并。所以后台里动一个数组里的任何一项，都会把整个数组发出去。
- **类型不对的覆盖会被忽略。** 万一 D1 里的数据被写坏了（比如 `hero` 整块变成了字符串），前台会退回内置默认值而不是照着渲染，页面不会整块变空。服务端在写入前也会拦一次，直接返回 400。
- **前后台用同一套合并规则**（都在 `util.js` 里），所以后台里看到的就是站点上显示的，不会有「后台显示 A、页面显示 B」。

改文案时如果只是想改默认值，`content-zh.js` 和 `content-en.js` 两个文件都要改。日常改信息用后台就够，不用碰这两个文件。

## 后台怎么用

打开 `/admin`，输入 `ADMIN_PASSWORD` 登录。

左侧是内容分区，右侧是当前分区的表单，顶部可以切换「中文 / English」，右侧栏是修改历史。

可以改的内容：

| 分区 | 里面有什么 |
| --- | --- |
| 页面信息 | 浏览器标题、页面描述、站点地址、跳转链接文案 |
| 导航栏 | 站点标识、菜单项名称、语言切换按钮文字 |
| 链接与社交 | 简历文件名、邮箱、GitHub / LinkedIn / X |
| 首屏 | 状态标签、姓名、职位、一句话简介、两个按钮的文字 |
| 首屏终端卡片 | 右侧终端那一块的自我介绍 |
| 关于我 | 小标题、导语、正文段落、事实清单 |
| 技能 | 导语、技能分组与组内条目 |
| 项目 | 导语、每张卡片的名称/说明/技术栈/演示地址/源码地址 |
| 工作经历 | 导语、每段的时间/职位/公司/做了什么 |
| 联系 | 导语、按钮上展示的邮箱 |
| 页脚 | 署名、技术说明、回到顶部 |

几个操作细节：

- **保存是「改哪存哪」。** 只把改动过的字段发出去，服务端深合并。按钮上会写「保存 3 处改动」，按 `Ctrl / Cmd + S` 同效。
- **中英文分别保存。** 两个语言各自有一份内容，切换标签页顶部会显示哪种语言还有未保存的改动。切语言之前记得保存。
- **每次保存都留一份快照。** 每种语言保留最近 20 份，右侧栏点「恢复」就能回到那一版，恢复本身也会记成一条新历史。
- **导出 / 导入。** 「导出全部内容」下载一份 JSON，可以在别的机器上导入；导入是整体覆盖，会明确告诉你覆盖哪些语言。
- **恢复默认。** 把当前语言恢复到 `content-*.js` 里的内置内容，当前版本会留在历史里，随时能找回来。
- **离开前会拦一下。** 有未保存改动时刷新或关页面，浏览器会弹确认框。

## 部署到 Cloudflare Pages

需要 Node 18+ 和一个 Cloudflare 账号。下面命令里的 `personal-page` 是项目名，想换成别的就同时改 `wrangler.toml` 里的 `name` 和 `package.json` 里两条 `secret:*` 脚本的 `--project-name`。

**登录 Cloudflare**

```bash
npx wrangler login
```

**建 D1 数据库**

```bash
npm run db:create
```

命令会输出一段带 `database_id` 的配置，把那串 id 填进 `wrangler.toml` 的 `[[d1_databases]]`（现在那里是全 0 的占位符）。**这一步不做，后台会一直报「D1 未绑定」。**

**建表**

```bash
npm run db:init:remote
```

`schema.sql` 用的是 `CREATE TABLE IF NOT EXISTS`，重复执行不会清掉已有数据。

**建 Pages 项目**

```bash
npm run project:create
```

**配置两个密钥**

```bash
npm run secret:password    # 交互式输入，回车确认——这是后台的登录密码
npm run secret:session     # 再输入一串长随机字符串，用来签会话 Cookie
```

两个命令都会提示你输入值，输入的内容不会回显、也不会写进仓库。换个更随机的密钥：

```bash
openssl rand -base64 32     # macOS / Linux / Git Bash
```

**部署**

```bash
npm run deploy
```

完成后访问 `https://personal-page.pages.dev`（域名取 `wrangler.toml` 里的 `name`）。

两个容易踩的坑：

- **`wrangler.toml` 是项目配置的唯一来源。** 用它部署过之后，控制台里对应的字段（D1 绑定这些）会变成只读，想改配置就改文件再部署一次。如果这个 Pages 项目你之前是在控制台里手工建的，先跑 `npx wrangler pages download config personal-page` 把现有配置拉下来看一眼，别让两边打架。
- **上面的命令是生产部署。** 以后如果接了 Git 集成，预览部署的绑定要在 `wrangler.toml` 里用 `[env.preview]` 单独写一份，否则预览网址上的后台会报「D1 未绑定」。

**确认部署成功**

```bash
curl https://personal-page.pages.dev/api/session
# 期望：{"authenticated":false,"expiresAt":null,"configured":true}

curl https://personal-page.pages.dev/api/content
# 期望：{"content":{},"updatedAt":null}
```

Windows 的 PowerShell 里要用 `curl.exe`（`curl` 是 `Invoke-WebRequest` 的别名，参数不一样）。

`configured` 是 `false`，说明两个密钥没配上；`/api/content` 返回 503 并提示「D1 未绑定」，说明 `database_id` 还是占位符或者填错了。用 `npm run tail` 可以看线上函数日志。

**登录后台改第一条内容**

打开 `https://personal-page.pages.dev/admin`，用刚才设的 `ADMIN_PASSWORD` 登录，把「页面信息 → 站点地址」改成你的正式域名，保存。这个值会写进 `og:url` 和结构化数据。

**绑定自己的域名（可选）**

Cloudflare 控制台 → Workers & Pages → 选中项目 → Custom domains → 添加。绑好之后把后台里的「站点地址」同步改成新域名。

### 上线前需要替换的占位内容

内置内容是给示例人物「张伟」写的一套模板，最好按下面顺序换成你自己的：

| 位置 | 要改什么 |
| --- | --- |
| 后台 → 首屏 | 姓名、职位、一句话简介、状态标签 |
| 后台 → 关于我 | 三段自我介绍、事实清单 |
| 后台 → 技能 / 项目 / 工作经历 | 全部换成你自己的 |
| 后台 → 链接与社交 | 邮箱、GitHub、LinkedIn、X |
| 后台 → 页面信息 | 浏览器标题、页面描述、站点地址 |
| 后台 → 页脚 | 署名 |
| `public/favicon.svg` | 换成自己的图标 |
| `public/resume-zh.pdf`、`resume-en.pdf` | 放两份真正能打开的简历 |

几点说明：

- **简历 PDF 是静态文件，后台改不了。** 「链接与社交 → 简历文件」里填的只是文件名，文件要自己放进 `public/` 再重新部署。如果不想展示这个按钮，把简历文件名清空即可——按钮会自动隐藏，不会变成死链。
- **头像、图片同理。** 这个后台只能改文字和链接，没有文件上传。
- 内置的示例数据是给人看的模板，改完记得两个语言都过一遍，英文那份也要改成你自己的。

## 接口一览

| 方法 | 路径 | 需要登录 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/content` | 否 | 读取两种语言的内容，带 ETag，命中返回 304 |
| PUT | `/api/content` | 是 | `{locale, patch}` 只改一部分；`{locale, reset:true}` 恢复默认 |
| GET | `/api/session` | 否 | 当前是否登录、服务端是否配了密码 |
| POST | `/api/login` | 否 | `{password}` 换一个签名 Cookie（有效期 7 天） |
| POST | `/api/logout` | 否 | 清掉 Cookie |
| GET | `/api/revisions?locale=zh` | 是 | 列出历史版本 |
| POST | `/api/revisions` | 是 | `{id}` 把某个版本恢复成当前内容 |

安全上的取舍：

- 密码只存在 Cloudflare 的密钥里，比较时用等长摘要，不会因为耗时差泄漏信息；会话 Cookie 是 `HttpOnly` + `SameSite=Strict`，内容只有「过期时间 + HMAC 签名」，服务端不存会话表。
- 登录失败限制是**尽力而为**的：Workers 的模块级变量只活在单个 isolate 里，同一 IP 落到不同 isolate 时计数不共享。它的作用是挡住脚本化暴力尝试。想更严格可以给 `/admin` 和 `/api/*` 套 Cloudflare Access，或者在控制台加一条 Rate Limiting 规则。
- 单次保存的内容上限 200KB，请求体上限 256KB。

## 已知取舍

- **首屏语言**：HTML 里默认是中文，英文用户首次进入可能看到一瞬间中文再被替换，因为要等 JS 跑完才能应用后台内容。
- **内容有缓存**：前台把上次取到的内容存在 `localStorage`，接口不通时用它兜底，所以线上改完内容偶尔要硬刷新一次。
- **结构化数据不翻译**：`application/ld+json` 是给爬虫看的，只保留一份，页面加载后用当前语言的内容刷新。
- **语言包写成 `.js` 而不是 JSON**：`file://` 协议下 `fetch` 会被 CORS 拦掉，所以内容直接挂到 `window.SITE_CONTENT`。
- **不用字体 CDN**：全部走系统字体栈，省掉一次渲染阻塞请求。
- **项目缩略图是 CSS 渐变**：没有图片资源，所以不会出现加载失败或布局抖动。想换成真图就给 `.card__thumb` 加 `<img>`，记得带上 `width`、`height` 和 `loading="lazy"`。
