-- ============================================================
-- D1 表结构
-- ============================================================
-- 本地：npx wrangler d1 execute site-content --local --file=schema.sql
-- 线上：npx wrangler d1 execute site-content --remote --file=schema.sql
--
-- 可以重复执行，不会清掉已有数据。
-- ============================================================

CREATE TABLE IF NOT EXISTS content (
  locale     TEXT PRIMARY KEY, -- 'zh' | 'en'
  data       TEXT NOT NULL,    -- 历次补丁累积后的稀疏内容，只含改过的字段（JSON 字符串）
  updated_at TEXT NOT NULL
);

-- 每次写入都留一份快照：保存记的是本次写入后的内容，恢复默认记的是被删掉的那份
CREATE TABLE IF NOT EXISTS revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  locale     TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 历史列表总是按「某种语言 + 倒序」查，这个索引正好覆盖
CREATE INDEX IF NOT EXISTS revisions_locale_id ON revisions (locale, id DESC);
