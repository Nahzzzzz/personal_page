/* ============================================================
   后台表单的字段定义
   ============================================================
   path 全部是内容对象里的点号路径，必须和 content-zh.js / content-en.js 一一对应。
   改这里等于改表单长什么样，但改不出语言包里没有的字段。

   字段类型：
     text      单行输入
     textarea  多行输入
     url       单行输入，浏览器会做格式校验
     list      字符串数组，每一项一个输入框
     cards     对象数组，每一项一张卡片；卡片内部还可以再嵌 list
   ============================================================ */

window.AdminSchema = (function () {
  "use strict";

  var T = { text: "text", area: "textarea", url: "url" };

  function field(path, label, type, hint) {
    return { path: path, label: label, type: type || T.text, hint: hint };
  }

  /* 卡片里的字段用相对路径，相对于所在的那一项 */
  function inner(path, label, type, hint) {
    return { path: path, label: label, type: type || T.text, hint: hint };
  }

  return {
    locales: [
      { id: "zh", label: "中文" },
      { id: "en", label: "English" },
    ],

    sections: [
      {
        id: "meta",
        title: "页面信息",
        desc: "浏览器标签页标题、搜索结果摘要、站点地址",
        fields: [
          field("meta.title", "浏览器标题", T.text, "显示在标签页和搜索结果的第一行"),
          field("meta.description", "页面描述", T.area, "搜索结果和社交分享时显示的摘要"),
          field("site.url", "站点地址", T.url, "部署后的正式域名，会写入 og:url 和结构化数据"),
          field("a11y.skip", "跳转正文链接", T.text, "键盘用户按 Tab 后看到的第一个链接"),
        ],
      },

      {
        id: "nav",
        title: "导航栏",
        desc: "左上角标识、菜单项名称、语言切换按钮",
        fields: [
          field("nav.brand", "站点标识", T.text, "导航栏左上角显示的名字"),
          field("nav.label", "导航区域说明", T.text, "给读屏软件用的区域名，不显示在页面上"),
          field("nav.about", "菜单：关于", T.text),
          field("nav.skills", "菜单：技能", T.text),
          field("nav.projects", "菜单：项目", T.text),
          field("nav.experience", "菜单：经历", T.text),
          field("nav.contact", "菜单：联系", T.text),
          field("nav.menu", "移动端菜单按钮", T.text, "屏幕上给读屏软件读的提示文字"),
          field("nav.langSwitch", "语言切换按钮", T.text, "写「切换到 English」时，当前语言是中文"),
        ],
      },

      {
        id: "links",
        title: "链接与社交",
        desc: "简历文件、邮箱、各个社交账号",
        fields: [
          field("links.resume", "简历文件", T.text, "填相对路径，比如 resume-zh.pdf，中英各一份"),
          field("links.email", "邮箱", T.text, "要带 mailto: 前缀"),
          field("links.github", "GitHub", T.url),
          field("links.linkedin", "LinkedIn", T.url),
          field("links.x", "X（推特）", T.url),
          field("links.socialLabel", "社交区域说明", T.text, "给读屏软件用"),
          field("links.githubLabel", "GitHub 提示", T.text, "鼠标悬停和读屏时念的名字"),
          field("links.linkedinLabel", "LinkedIn 提示", T.text),
          field("links.xLabel", "X 提示", T.text),
          field("links.emailLabel", "邮箱提示", T.text),
        ],
      },

      {
        id: "hero",
        title: "首屏",
        desc: "打开页面第一眼看到的内容",
        fields: [
          field("hero.status", "状态标签", T.text, "左上角带绿点的那句话，不想展示就留空"),
          field("hero.name", "姓名", T.text),
          field("hero.role", "职位", T.text),
          field("hero.lead", "一句话简介", T.area),
          field("hero.ctaProjects", "按钮：查看项目", T.text),
          field("hero.ctaResume", "按钮：下载简历", T.text),
        ],
      },

      {
        id: "terminal",
        title: "首屏终端卡片",
        desc: "右侧那块终端样式的自我介绍",
        fields: [
          field("terminal.label", "区域说明", T.text, "给读屏软件用"),
          field("terminal.whoami", "whoami 输出", T.text),
          field("terminal.focus", "focus.txt 输出", T.text),
          field("terminal.now", "现在在做的事", T.text),
        ],
      },

      {
        id: "about",
        title: "关于我",
        desc: "段落越靠前越显眼，事实清单一栏一条",
        fields: [
          field("about.eyebrow", "小标题", T.text, "区块标题上方那行小字"),
          field("about.title", "区块标题", T.text),
          field("about.lead", "区块导语", T.area),
          {
            path: "about.paragraphs",
            label: "正文段落",
            type: "list",
            itemLabel: "段落",
            hint: "每段一个框，段落之间会自动留出间距",
          },
          {
            path: "about.facts",
            label: "事实清单",
            type: "cards",
            itemTitle: "label",
            addLabel: "添加一条",
            fields: [
              inner("label", "名称", T.text, "比如「所在地」"),
              inner("value", "内容", T.text, "比如「杭州，中国」"),
            ],
          },
        ],
      },

      {
        id: "skills",
        title: "技能",
        desc: "按分组展示，组内越靠前的越常用",
        fields: [
          field("skills.eyebrow", "小标题", T.text),
          field("skills.title", "区块标题", T.text),
          field("skills.lead", "区块导语", T.area),
          {
            path: "skills.groups",
            label: "技能分组",
            type: "cards",
            itemTitle: "title",
            addLabel: "添加分组",
            fields: [
              inner("title", "分组名称", T.text, "比如「前端」"),
              inner("items", "技能项", "list", "一个技能一个框，顺序就是显示顺序"),
            ],
          },
        ],
      },

      {
        id: "projects",
        title: "项目",
        desc: "每张卡片一个项目，缩略图配色按顺序自动循环",
        fields: [
          field("projects.eyebrow", "小标题", T.text),
          field("projects.title", "区块标题", T.text),
          field("projects.lead", "区块导语", T.area),
          field("projects.demoLabel", "卡片链接：演示", T.text, "卡片上指向演示地址的链接文字"),
          field("projects.codeLabel", "卡片链接：源码", T.text),
          {
            path: "projects.items",
            label: "项目列表",
            type: "cards",
            itemTitle: "title",
            addLabel: "添加项目",
            fields: [
              inner("title", "项目名称", T.text),
              inner("desc", "一句话说明", T.area, "讲清楚解决了什么问题，比罗列技术点更有用"),
              inner("stack", "技术栈", "list", "一个技术一个框"),
              inner("demo", "演示地址", T.url, "留空则不显示这个入口"),
              inner("code", "源码地址", T.url, "留空则不显示这个入口"),
            ],
          },
        ],
      },

      {
        id: "experience",
        title: "工作经历",
        desc: "按时间倒序排列，第一条是最新的",
        fields: [
          field("experience.eyebrow", "小标题", T.text),
          field("experience.title", "区块标题", T.text),
          field("experience.lead", "区块导语", T.area),
          {
            path: "experience.items",
            label: "经历列表",
            type: "cards",
            itemTitle: "role",
            addLabel: "添加经历",
            fields: [
              inner("period", "时间区间", T.text, "比如「2023 — 至今」"),
              inner("role", "职位", T.text),
              inner("org", "公司 / 团队", T.text),
              inner("points", "做了什么", "list", "一条一个框，写结果而不是职责"),
            ],
          },
        ],
      },

      {
        id: "contact",
        title: "联系",
        desc: "页面最后一块区块",
        fields: [
          field("contact.eyebrow", "小标题", T.text),
          field("contact.title", "区块标题", T.text),
          field("contact.lead", "区块导语", T.area),
          field("contact.email", "展示的邮箱", T.text, "按钮上显示的文字，实际地址取「链接与社交」里那个"),
        ],
      },

      {
        id: "footer",
        title: "页脚",
        desc: "版权行和回到顶部",
        fields: [
          field("footer.name", "署名", T.text),
          field("footer.note", "技术说明", T.text),
          field("footer.top", "回到顶部", T.text),
        ],
      },
    ],

    section: function (id) {
      var found = null;
      this.sections.forEach(function (section) {
        if (section.id === id) found = section;
      });
      return found;
    },
  };
})();
