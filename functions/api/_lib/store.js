/* ============================================================
   D1 存储层
   ============================================================
   表结构见项目根目录的 schema.sql。

   content   ：每种语言一行，存合并后的完整内容（JSON 字符串）
   revisions ：每次写入前留一份快照，后台可以回滚

   注意 content 存的是「整份内容」而不是补丁：读取时不用做合并，
   回滚和导出也直接就是它。
   ============================================================ */

import { HttpError } from "./http.js";

/* 每种语言保留的历史版本数 */
const KEEP_REVISIONS = 20;

export function requireDb(env) {
  if (!env.DB) {
    throw new HttpError(503, "D1 未绑定：请先创建数据库并检查 wrangler.toml 里的 d1_databases");
  }

  return env.DB;
}

function parseRow(row) {
  if (!row) return null;

  try {
    return { locale: row.locale, data: JSON.parse(row.data), updatedAt: row.updated_at };
  } catch (error) {
    /* 数据坏了不能连累整站，退回内置默认值，同时在日志里留痕 */
    console.error(`[store] locale=${row.locale} 的内容不是合法 JSON，已忽略`);

    return { locale: row.locale, data: null, updatedAt: row.updated_at, broken: true };
  }
}

export async function readAll(env) {
  const { results } = await requireDb(env)
    .prepare("SELECT locale, data, updated_at FROM content")
    .all();

  const content = {};
  let updatedAt = null;

  for (const row of results || []) {
    const parsed = parseRow(row);

    if (parsed && parsed.data && !parsed.broken) content[parsed.locale] = parsed.data;
    if (parsed && parsed.updatedAt && (!updatedAt || parsed.updatedAt > updatedAt)) {
      updatedAt = parsed.updatedAt;
    }
  }

  return { content, updatedAt };
}

export async function readLocale(env, locale) {
  const row = await requireDb(env)
    .prepare("SELECT locale, data, updated_at FROM content WHERE locale = ?")
    .bind(locale)
    .first();

  const parsed = parseRow(row);
  return parsed && !parsed.broken ? parsed.data : null;
}

/* 写入并顺手留一份快照；batch 在 D1 里是一个事务 */
export async function writeLocale(env, locale, data) {
  const db = requireDb(env);
  const now = new Date().toISOString();
  const payload = JSON.stringify(data);

  await db.batch([
    db
      .prepare(
        `INSERT INTO content (locale, data, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(locale) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .bind(locale, payload, now),
    db
      .prepare("INSERT INTO revisions (locale, data, created_at) VALUES (?1, ?2, ?3)")
      .bind(locale, payload, now),
    db
      .prepare(
        `DELETE FROM revisions
         WHERE locale = ?1
           AND id NOT IN (
             SELECT id FROM revisions WHERE locale = ?2 ORDER BY id DESC LIMIT ?3
           )`
      )
      .bind(locale, locale, KEEP_REVISIONS),
  ]);

  return now;
}

/* 恢复默认 = 删掉这一行。删之前先把当前内容存成快照，这样删了也能找回来。 */
export async function deleteLocale(env, locale) {
  const db = requireDb(env);
  const current = await readLocale(env, locale);

  if (current == null) return false;

  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare("INSERT INTO revisions (locale, data, created_at) VALUES (?1, ?2, ?3)")
      .bind(locale, JSON.stringify(current), now),
    db.prepare("DELETE FROM content WHERE locale = ?1").bind(locale),
  ]);

  return true;
}

export async function listRevisions(env, locale, limit = KEEP_REVISIONS) {
  const { results } = await requireDb(env)
    .prepare(
      "SELECT id, created_at, length(data) AS size FROM revisions WHERE locale = ?1 ORDER BY id DESC LIMIT ?2"
    )
    .bind(locale, limit)
    .all();

  return (results || []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    size: row.size,
  }));
}

export async function readRevision(env, id) {
  const row = await requireDb(env)
    .prepare("SELECT id, locale, data, created_at FROM revisions WHERE id = ?")
    .bind(id)
    .first();

  if (!row) return null;

  try {
    return { id: row.id, locale: row.locale, data: JSON.parse(row.data), createdAt: row.created_at };
  } catch (error) {
    throw new HttpError(500, "这个历史版本的内容已损坏，无法恢复");
  }
}
