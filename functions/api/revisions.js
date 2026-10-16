/* ============================================================
   GET  /api/revisions?locale=zh   列出历史版本（需要登录）
   POST /api/revisions             把某个版本恢复成当前内容（需要登录）
   ============================================================
   每次保存（以及「恢复默认」）都会自动留下快照，每种语言保留最近 20 份。
   改错了直接在这里点回去，不用手工重填。
   ============================================================ */

import { HttpError, json, readJson } from "./_lib/http.js";
import { requireSession } from "./_lib/auth.js";
import { listRevisions, readRevision, writeLocale } from "./_lib/store.js";

const LOCALES = ["zh", "en"];

export async function onRequestGet({ request, env }) {
  /* 历史列表只有后台会读，同样要求登录，免得外人看到你改内容的节奏 */
  await requireSession(env, request);

  const locale = new URL(request.url).searchParams.get("locale") || "zh";

  if (!LOCALES.includes(locale)) throw new HttpError(400, `不支持的语言：${locale}`);

  return json({ locale, revisions: await listRevisions(env, locale) });
}

export async function onRequestPost({ request, env }) {
  await requireSession(env, request);

  const body = await readJson(request);
  const id = Number(body.id);

  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "缺少历史版本 id");

  const revision = await readRevision(env, id);
  if (!revision) throw new HttpError(404, "这个历史版本不存在");

  /* 恢复也走一次正常写入，于是这次覆盖本身也变成新的一条历史 */
  const updatedAt = await writeLocale(env, revision.locale, revision.data);

  return json({
    ok: true,
    locale: revision.locale,
    updatedAt,
    restoredFrom: { id: revision.id, createdAt: revision.createdAt },
    content: revision.data,
  });
}
