/* ============================================================
   Site content · English
   ============================================================
   Same structure as content-zh.js — keep every key in sync, or the
   page will fall back to the Chinese value when switching language.

   This file is the first-paint content and the offline fallback.
   Content saved from /admin lives in D1 and overrides these fields.
   ============================================================ */

window.SITE_CONTENT = window.SITE_CONTENT || {};

window.SITE_CONTENT.en = {
  meta: {
    title: "Zhang Wei · Full-Stack Engineer",
    description:
      "Personal site of Zhang Wei, a full-stack engineer focused on web platforms and developer tooling. Projects, experience, and contact.",
  },

  site: {
    url: "https://example.com",
  },

  a11y: {
    skip: "Skip to main content",
  },

  nav: {
    brand: "Zhang Wei",
    label: "Main navigation",
    about: "About",
    skills: "Skills",
    projects: "Projects",
    experience: "Experience",
    contact: "Contact",
    menu: "Open menu",
    langSwitch: "Switch to 中文",
  },

  links: {
    resume: "resume-en.pdf",
    email: "mailto:hello@example.com",
    github: "https://github.com/yourname",
    linkedin: "https://www.linkedin.com/in/yourname",
    x: "https://x.com/yourname",
    socialLabel: "Social links",
    githubLabel: "GitHub",
    linkedinLabel: "LinkedIn",
    xLabel: "X (Twitter)",
    emailLabel: "Send email",
  },

  hero: {
    status: "Open to full-time and remote roles",
    name: "Zhang Wei",
    role: "Full-Stack Engineer",
    lead:
      "Five years building web products, mostly front-end architecture and developer tooling. I like breaking complex systems into pieces I can explain clearly, and writing docs and automation to kill repetitive work.",
    ctaProjects: "View projects",
    ctaResume: "Download resume",
  },

  terminal: {
    label: "Terminal-style introduction",
    whoami: "zhang-wei · full-stack engineer",
    focus: "web platform · dev tooling · performance",
    now: "open source / side projects / writing",
  },

  about: {
    eyebrow: "01 / About",
    title: "About me",
    lead: "Three paragraphs on who I am, what I build, and what I care about.",
    paragraphs: [
      "I'm Zhang Wei, a full-stack engineer based in Hangzhou. My day job is designing and maintaining web platforms for internal teams. I've worked across the whole path — API design, front-end architecture, and the deployment pipeline — which is why questions like \"why did this get slow\" and \"why is this hard to change\" interest me so much.",
      "For the past two years I've focused on two things: automating repetitive engineering workflow so nobody has to run release checks by hand, and adding observability so production issues can be traced to a specific module in minutes instead of guessed at.",
      "Outside work I write open-source tools and keep a notes repository documenting problems I ran into. If you're working on something similar, or want to talk about engineering effectiveness, feel free to email me.",
    ],
    facts: [
      { label: "Location", value: "Hangzhou, China" },
      { label: "Experience", value: "5 years" },
      { label: "Focus", value: "Web platforms & developer tooling" },
      { label: "Core stack", value: "TypeScript · React · Node.js · Go" },
      { label: "Languages", value: "Chinese (native) · English (working)" },
      { label: "Status", value: "Open to new roles" },
    ],
  },

  skills: {
    eyebrow: "02 / Skills",
    title: "Skills",
    lead: "Grouped by how often I use them — the further left in each group, the more I lean on it.",
    groups: [
      { title: "Languages", items: ["TypeScript", "JavaScript", "Go", "Python", "SQL"] },
      {
        title: "Front end",
        items: ["React", "Next.js", "Vue", "Tailwind CSS", "Vite", "Zustand"],
      },
      {
        title: "Backend & data",
        items: ["Node.js", "Fastify", "PostgreSQL", "Redis", "REST", "GraphQL"],
      },
      {
        title: "Infrastructure",
        items: ["Docker", "Kubernetes", "GitHub Actions", "Terraform", "AWS", "Grafana"],
      },
    ],
  },

  projects: {
    eyebrow: "03 / Projects",
    title: "Projects",
    lead: "A few examples that show what I was solving and how I approached it.",
    demoLabel: "Live demo",
    codeLabel: "Source",
    items: [
      {
        title: "Flowboard",
        desc: "A real-time collaborative kanban tool. CRDTs resolve offline edit conflicts, so dragging cards on a flaky connection never loses an operation.",
        stack: ["React", "TypeScript", "WebSocket", "PostgreSQL"],
        demo: "https://example.com",
        code: "https://github.com/yourname",
      },
      {
        title: "Logpipe",
        desc: "A lightweight log collection and search service that handles 200k events per second on a single node, with a query language and alert rule editor.",
        stack: ["Go", "ClickHouse", "Docker"],
        demo: "https://example.com",
        code: "https://github.com/yourname",
      },
      {
        title: "Design Tokens Kit",
        desc: "A CLI that syncs design tokens to CSS, Tailwind, and design files, so design and code stop maintaining two copies of the same numbers.",
        stack: ["Node.js", "TypeScript", "CLI"],
        demo: "https://example.com",
        code: "https://github.com/yourname",
      },
      {
        title: "EasyCron",
        desc: "A visual editor for cron expressions with next-run previews and templates for common schedules. Runs entirely in the browser, works offline.",
        stack: ["Vue", "Vite", "PWA"],
        demo: "https://example.com",
        code: "https://github.com/yourname",
      },
      {
        title: "Perf Lab",
        desc: "A small SDK plus dashboard that collects real user metrics and reports them, so teams can find which page is actually hurting the experience.",
        stack: ["TypeScript", "Web Vitals", "Grafana"],
        demo: "https://example.com",
        code: "https://github.com/yourname",
      },
      {
        title: "Note Vault",
        desc: "A local-first Markdown notes app with full-text search and backlinks. Everything stays in the browser; nothing is uploaded.",
        stack: ["React", "IndexedDB", "Web Worker"],
        demo: "https://example.com",
        code: "https://github.com/yourname",
      },
    ],
  },

  experience: {
    eyebrow: "04 / Experience",
    title: "Experience",
    lead: "Only the parts that produced a result — job descriptions left out.",
    items: [
      {
        period: "2023 — Present",
        role: "Senior Front-End Engineer",
        org: "Yunqi Technology · Hangzhou",
        points: [
          "Led an architecture overhaul of the internal engineering platform, cutting full builds from 9 minutes to under 90 seconds.",
          "Defined shared design tokens and component conventions, removing roughly 60% of duplicated styling across four products.",
          "Built front-end observability, bringing mean time to locate production issues from hours down to under 10 minutes.",
        ],
      },
      {
        period: "2021 — 2023",
        role: "Front-End Engineer",
        org: "Lightyear Data · Hangzhou",
        points: [
          "Built the data visualization console from scratch, supporting 30+ chart types and customizable dashboards.",
          "Introduced end-to-end tests covering the critical paths, more than halving post-release rollbacks.",
        ],
      },
      {
        period: "2019 — 2021",
        role: "Full-Stack Engineer",
        org: "Stardust Studio · Remote",
        points: [
          "Delivered a dozen corporate sites and small back-office systems independently, from requirements gathering through deployment.",
          "Extracted a reusable project scaffold that cut new-project setup from two days to half a day.",
        ],
      },
    ],
  },

  contact: {
    eyebrow: "05 / Contact",
    title: "Let's talk",
    lead:
      "Whether it's a job opportunity, a technical collaboration, or a specific engineering problem you want to discuss, email is the best way to reach me. I usually reply within two business days.",
    email: "hello@example.com",
  },

  footer: {
    name: "Zhang Wei",
    note: "built with HTML, CSS, and vanilla JavaScript",
    top: "Back to top ↑",
  },
};
