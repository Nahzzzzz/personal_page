/* ============================================================
   站点内容 · 简体中文
   ============================================================
   这是站点全部文案的唯一来源：改这里就是改页面，改完重新部署一次即可。
   结构必须与 content-en.js 完全一致 —— 两边不同步时，切到缺字段的那份会
   留空，浏览器控制台还会打印「缺少文案」。

   字段含义见根目录 AGENTS.md 的「内容字段速查」。
   ============================================================ */

window.SITE_CONTENT = window.SITE_CONTENT || {};

window.SITE_CONTENT.zh = {
  meta: {
    title: "张子航 · 全栈工程师",
    description:
      "张子航的个人主页：全栈工程师，专注 Web 平台与开发者工具。项目作品、技术经历与联系方式。",
  },

  site: {
    url: "https://personal-page-2xn.pages.dev",
  },

  a11y: {
    skip: "跳到主要内容",
  },

  nav: {
    brand: "张子航",
    label: "主导航",
    about: "关于",
    skills: "技能",
    projects: "项目",
    experience: "经历",
    contact: "联系",
    menu: "打开菜单",
    langSwitch: "切换到 English",
  },

  links: {
    /* 这几个链接留空时，页面上对应的按钮 / 图标会自动隐藏，不会留下死链。
       填了就显示：resume 填 public/ 里的文件名，email 写 mailto: 开头。 */
    resume: "",
    email: "",
    github: "",
    linkedin: "",
    x: "",
    socialLabel: "社交链接",
    githubLabel: "GitHub",
    linkedinLabel: "LinkedIn",
    xLabel: "X（推特）",
    emailLabel: "发送邮件",
  },

  hero: {
    status: "开放全职与远程机会",
    name: "张子航",
    role: "全栈工程师",
    lead:
      "五年 Web 开发经验，主要做前端架构与开发者工具。喜欢把复杂的系统拆成能解释清楚的小块，也喜欢写文档和自动化脚本来减少重复劳动。",
    ctaProjects: "查看项目",
    ctaResume: "下载简历",
  },

  terminal: {
    label: "终端样式的自我介绍",
    whoami: "zhang-zihang · 全栈工程师",
    focus: "Web 平台 · 开发者工具 · 性能优化",
    now: "开源项目 / 副业产品 / 技术写作",
  },

  about: {
    eyebrow: "01 / 关于",
    title: "关于我",
    lead: "三句话说明我是谁、在做什么、关心什么问题。",
    paragraphs: [
      "我是张子航，一名全栈工程师，现在在杭州。日常工作是设计并维护面向内部团队的 Web 平台：从接口设计、前端架构一直到部署流水线，整条链路都参与过，也因此对「系统为什么变慢、为什么难改」这类问题特别感兴趣。",
      "最近两年我把精力放在两件事上：一是把重复的工程流程自动化，让团队不用手工做发布检查；二是补上可观测性，让线上问题能在几分钟内定位到具体模块，而不是靠猜。",
      "工作之外会写一些开源工具，也维护一个记录踩坑过程的技术笔记仓库。如果你在做类似的事情，或者想聊聊工程效率的话题，欢迎直接联系我。",
    ],
    facts: [
      { label: "所在地", value: "杭州，中国" },
      { label: "工作年限", value: "5 年" },
      { label: "当前方向", value: "Web 平台与开发者工具" },
      { label: "常用技术", value: "TypeScript · React · Node.js · Go" },
      { label: "语言", value: "中文（母语）· 英语（工作语言）" },
      { label: "状态", value: "开放新机会" },
    ],
  },

  skills: {
    eyebrow: "02 / 技能",
    title: "技能",
    lead: "按使用频率和熟悉程度分组，越靠前的越常用。",
    groups: [
      { title: "语言", items: ["TypeScript", "JavaScript", "Go", "Python", "SQL"] },
      {
        title: "前端",
        items: ["React", "Next.js", "Vue", "Tailwind CSS", "Vite", "Zustand"],
      },
      {
        title: "后端与数据",
        items: ["Node.js", "Fastify", "PostgreSQL", "Redis", "REST", "GraphQL"],
      },
      {
        title: "基础设施",
        items: ["Docker", "Kubernetes", "GitHub Actions", "Terraform", "AWS", "Grafana"],
      },
    ],
  },

  projects: {
    eyebrow: "03 / 项目",
    title: "项目",
    lead: "挑了几个能说明我在解决什么问题、怎么解决的例子。",
    demoLabel: "在线演示",
    codeLabel: "源码",
    items: [
      {
        title: "Flowboard",
        desc: "支持多人实时协作的看板工具。用 CRDT 处理离线编辑冲突，弱网环境下拖动卡片也不会丢操作。",
        stack: ["React", "TypeScript", "WebSocket", "PostgreSQL"],
        demo: "",
        code: "",
      },
      {
        title: "Logpipe",
        desc: "轻量日志采集与检索服务，单机每秒能处理二十万条日志，附带查询语言和告警规则配置界面。",
        stack: ["Go", "ClickHouse", "Docker"],
        demo: "",
        code: "",
      },
      {
        title: "Design Tokens Kit",
        desc: "把设计变量自动同步到 CSS、Tailwind 和设计稿的命令行工具，让设计与代码不再各维护一份数值。",
        stack: ["Node.js", "TypeScript", "CLI"],
        demo: "",
        code: "",
      },
      {
        title: "EasyCron",
        desc: "可视化编辑 cron 表达式的网页工具，带下次执行时间预览和常用表达式模板，纯前端可离线使用。",
        stack: ["Vue", "Vite", "PWA"],
        demo: "",
        code: "",
      },
      {
        title: "Perf Lab",
        desc: "收集真实用户性能指标并生成报告的小型 SDK 与看板，帮团队定位到底哪个页面在拖慢体验。",
        stack: ["TypeScript", "Web Vitals", "Grafana"],
        demo: "",
        code: "",
      },
      {
        title: "Note Vault",
        desc: "本地优先的 Markdown 笔记应用，支持全文检索和双向链接，数据完全存在浏览器里，不上传任何内容。",
        stack: ["React", "IndexedDB", "Web Worker"],
        demo: "",
        code: "",
      },
    ],
  },

  experience: {
    eyebrow: "04 / 经历",
    title: "工作经历",
    lead: "只写做出结果的部分，职责描述就省略了。",
    items: [
      {
        period: "2023 — 至今",
        role: "高级前端工程师",
        org: "云启科技 · 杭州",
        points: [
          "主导内部研发平台的架构升级，把完整构建时间从 9 分钟压到 90 秒以内。",
          "设计统一的设计变量与组件规范，跨 4 个产品的样式重复代码减少约 60%。",
          "搭建前端可观测性方案，线上问题的平均定位时间从小时级降到 10 分钟以内。",
        ],
      },
      {
        period: "2021 — 2023",
        role: "前端工程师",
        org: "光年数据 · 杭州",
        points: [
          "从零搭建数据可视化后台，支持 30 多种图表类型和可自定义的仪表盘。",
          "引入端到端测试覆盖核心流程，发布后的回滚次数下降一半以上。",
        ],
      },
      {
        period: "2019 — 2021",
        role: "全栈工程师",
        org: "星尘工作室 · 远程",
        points: [
          "独立交付十多个企业官网与小型后台系统，覆盖从需求沟通到上线运维的全过程。",
          "沉淀出一套可复用的项目脚手架，新项目初始化时间从两天缩短到半天。",
        ],
      },
    ],
  },

  contact: {
    eyebrow: "05 / 联系",
    title: "聊聊？",
    lead:
      "不管是工作机会、技术合作，还是想讨论某个具体的工程问题，都欢迎直接联系我。",
    email: "发邮件给我",
  },

  footer: {
    name: "张子航",
    note: "用 HTML、CSS 和原生 JavaScript 构建",
    top: "回到顶部 ↑",
  },
};
