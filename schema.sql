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
  data       TEXT NOT NULL,    -- 合并后的完整内容（JSON 字符串）
  updated_at TEXT NOT NULL
);

-- 每次写入（含「恢复默认」）前留一份快照，后台可以回滚
CREATE TABLE IF NOT EXISTS revisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  locale     TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 历史列表总是按「某种语言 + 倒序」查，这个索引正好覆盖
CREATE INDEX IF NOT EXISTS revisions_locale_id ON revisions (locale, id DESC);
