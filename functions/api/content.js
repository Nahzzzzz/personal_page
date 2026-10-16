/* ============================================================
   GET  /api/content   公开读取，前台页面用
   PUT  /api/content   需要登录，按语言写入修改
   ============================================================
   PUT 的请求体：
     { "locale": "zh", "patch": { "hero": { "name": "…" } } }   只改一部分
     { "locale": "zh", "reset": true }                          丢弃后台内容，回到内置默认值

   patch 是「深合并」语义，数组整体替换 —— 前台 util.js 用的是同一套规则，
   所以后台只发改动过的字段就够了，不用回传整份内容。
   ============================================================ */

import {
  HttpError,
  assertKindConsistent,
  assertSafePayload,
  deepMerge,
  isPlainObject,
  json,
  readJson,
} from "./_lib/http.js";
import { requireSession } from "./_lib/auth.js";
import { deleteLocale, readAll, readLocale, writeLocale } from "./_lib/store.js";

const LOCALES = ["zh", "en"];
const MAX_STORED_BYTES = 200 * 1024;

export async function onRequestGet({ request, env }) {
  const { content, updatedAt } = await readAll(env);
  const etag = `"${updatedAt || "empty"}"`;

  /* 内容改完要立刻生效，所以只能协商缓存：命中就直接 304，不重传整份内容 */
  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "no-cache" } });
  }

  return json(
    { content, updatedAt },
    { headers: { "Cache-Control": "no-cache", ETag: etag } }
  );
}

export async function onRequestPut({ request, env }) {
  await requireSession(env, request);

  const body = await readJson(request);
  const locale = typeof body.locale === "string" ? body.locale : "";

  if (!LOCALES.includes(locale)) {
    throw new HttpError(400, `不支持的语言：${locale || "(空)"}，只支持 ${LOCALES.join(" / ")}`);
  }

  if (body.reset === true) {
    const removed = await deleteLocale(env, locale);
    return json({ ok: true, locale, reset: true, removed });
  }

  const patch = body.patch;
  if (!isPlainObject(patch)) throw new HttpError(400, "patch 必须是一个对象");
  if (!Object.keys(patch).length) throw new HttpError(400, "没有需要保存的修改");

  assertSafePayload(patch);

  /* 存量内容打底，避免 patch 里没提到的字段被覆盖掉 */
  const current = (await readLocale(env, locale)) || {};

  /* 类型不对的覆盖直接拒掉，别让它有机会把某个区块写空 */
  assertKindConsistent(current, patch);

  const next = deepMerge(current, patch);

  const size = JSON.stringify(next).length;
  if (size > MAX_STORED_BYTES) {
    throw new HttpError(413, `内容体积 ${Math.round(size / 1024)}KB 超过上限，请精简后再保存`);
  }

  const updatedAt = await writeLocale(env, locale, next);

  return json({ ok: true, locale, updatedAt, content: next });
}
