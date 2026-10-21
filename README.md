# 张子航 · 个人主页

一个纯静态的单页个人主页，中文 / English 双语。

- 原生 HTML / CSS / JavaScript，没有框架、没有构建步骤、没有打包器
- 不发任何网络请求：字体走系统字体栈，图标是内联 SVG，缩略图是 CSS 渐变
- 直接用浏览器打开 `public/index.html` 就能看到完整效果，不依赖本地服务
- 部署目标是 Cloudflare Pages

## 目录结构

```
public/                       唯一会被上传到 Cloudflare 的目录
  index.html                  页面骨架：文本用 data-i18n 标记，列表用 data-list 挂载
  favicon.svg                 图标
  robots.txt                  允许收录
  _headers                    Cloudflare Pages 的自定义响应头
  assets/css/
    tokens.css                设计变量：配色、字号、间距、圆角、断点
    base.css                  reset、排版、按钮、标签、入场动画、减少动态效果
    sections.css              各区块布局与响应式（900px / 560px）
  assets/js/
    boot.js                   head 内同步执行，给 <html> 加 .js 类
    util.js                   点号路径取值（data-i18n="hero.name" 就是一条路径）
    content-zh.js             中文文案
    content-en.js             英文文案（结构与中文逐层一致）
    render.js                 列表类内容 → DOM
    content.js                语言选择、刷 DOM、切换语言
    main.js                   导航状态、移动端菜单、滚动高亮、入场动画

wrangler.toml                 Pages 项目名与输出目录（部署用）
package.json                  只有 wrangler 一个开发依赖
AGENTS.md                     仓库约定、字段速查、改动落点
```

## 本地预览

```bash
npm install
npm run dev          # 起在 http://localhost:8788
```

`npm run dev` 走的是 `wrangler pages dev`，会连 `_headers` 一起应用，最接近线上。

不想装依赖也行：直接双击 `public/index.html`，页面同样是完整的（脚本里没有任何 fetch）。

## 改内容

所有文字都在 `public/assets/js/content-zh.js` 和 `content-en.js` 里，改完文件刷新页面就生效，部署后访客看到的也是改后的内容。

改的时候注意两点：

- **两个文件的键必须一一对应。** 少了哪个键，切到那份语言时对应位置会留空，浏览器控制台会打印「缺少文案：xxx」。
- **`public/index.html` 里的文字只是兜底。** 页面上显示的最终内容来自 JS 文件，HTML 里的那份只是给搜索引擎和脚本执行失败时看的。新增字段时要两边都加（见 `AGENTS.md`）。

字段清单见 `AGENTS.md` 的「内容字段速查」。

## 替换素材

| 要换的东西 | 怎么做 |
| --- | --- |
| 图标 | 替换 `public/favicon.svg` |
| 简历 | 把 PDF 放进 `public/`，再把文件名写进两个语言包的 `links.resume`。默认留空，按钮不显示（避免死链）；填了文件名按钮就会出现 |
| 社交链接 | `links.github`、`links.linkedin`、`links.x`、`links.email`。**当前都是空的**，留空时对应的图标和联系按钮不会出现在页面上；填上地址后自动显示 |
| 站点地址 | `site.url`，已设为 `https://personal-page-2xn.pages.dev`，会写进 `og:url` 和结构化数据 |

> **上线前还要换掉的示例内容：** 关于我的三段文字、技能分组、六个项目、三段工作经历里的公司名和数字都是虚构的示例，换域名之前请按自己的真实情况改。社交链接已全部留空，页面上不会出现指向不存在账号的图标。

## 改配色

只改 `public/assets/css/tokens.css`。`base.css` 和 `sections.css` 里的颜色、间距都引用 `var(--*)`，不写死数值。

## 部署到 Cloudflare

站点当前的线上地址是 **https://personal-page-2xn.pages.dev**（`personal-page.pages.dev` 已被别人占用，Cloudflare 自动加了后缀）。

### 方式一：Git 集成（推荐）

推送到 GitHub 后自动构建部署：

1. 打开 Cloudflare 控制台 → **Workers & Pages** → `personal-page` → **Settings** → **Builds** → 连接仓库
2. 构建配置填三个值：

   | 字段 | 值 |
   | --- | --- |
   | Build command | 留空（这个项目没有构建步骤） |
   | Deploy command | **留空** |
   | Build output directory | `public` |

3. 之后每次 push 到 `main` 都会自动部署。

Deploy command 留空是关键：纯静态站点由 Pages 自己上传输出目录，不需要再调 `wrangler deploy`。填 `wrangler deploy` 会直接失败（它是 Workers 的命令，会报 `Missing entry-point to Worker script or to assets directory`）。

### 方式二：本地用 wrangler 部署

```bash
npx wrangler login
npm run deploy
```

`npm run deploy` 就是 `wrangler pages deploy`，读 `wrangler.toml` 里的 `pages_build_output_dir`，只上传 `public/`。

### 部署后自检

```bash
curl.exe -I https://personal-page-2xn.pages.dev/
curl.exe https://personal-page-2xn.pages.dev/robots.txt
```

首页返回 `200` 且 `X-Content-Type-Options: nosniff` 在响应头里，说明静态文件和 `_headers` 都生效了。

## 已知限制

- **没有后台。** 改一句文案要改文件再重新部署，换来的是零后端、零数据库、零密钥。
- **语言包不同步只会留空，不会报错。** 控制台会有 `[content] 缺少文案` 的警告，改完记得切一次语言看一眼。
- **首屏语言可能闪一下。** HTML 里默认是中文，英文访客要等 JS 跑完才切成英文；换来的是不依赖 JS 也能看到完整内容。
