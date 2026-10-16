/* ============================================================
   POST /api/login    用管理密码换一个签名 Cookie
   ============================================================
   失败次数限制是「尽力而为」的：Workers 的模块级变量只活在单个 isolate 里，
   同一 IP 命中不同 isolate 时计数不共享。它的作用是挡住脚本化暴力尝试，
   真要防得更死，得上 Durable Object 或 Cloudflare 的 Rate Limiting 规则。
   ============================================================ */

import { HttpError, clientIp, delay, fail, json, readJson } from "./_lib/http.js";
import { createSessionToken, sessionCookie, verifyPassword } from "./_lib/auth.js";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const FAIL_DELAY_MS = 400;

const attempts = new Map();

function tooManyAttempts(ip) {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) return 0;
  if (record.count < MAX_ATTEMPTS) return 0;

  return Math.ceil((record.resetAt - now) / 1000);
}

function recordFailure(ip) {
  const now = Date.now();

  /* 表不会自己变小，偶尔整体清一次，避免 isolate 长活时一直堆 */
  if (attempts.size > 500) attempts.clear();

  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  record.count += 1;
}

function clearFailures(ip) {
  attempts.delete(ip);
}

export async function onRequestPost({ request, env }) {
  const ip = clientIp(request);
  const retryAfter = tooManyAttempts(ip);

  if (retryAfter) {
    return json(
      { error: `尝试次数过多，请 ${Math.ceil(retryAfter / 60)} 分钟后再试` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const body = await readJson(request);
  const password = typeof body.password === "string" ? body.password : "";

  let ok = false;

  try {
    ok = await verifyPassword(env, password);
  } catch (error) {
    /* 配置缺失属于服务端问题，直接暴露原因，否则本地调试会一直猜 */
    if (error instanceof HttpError) return fail(error.status, error.message);
    throw error;
  }

  if (!ok) {
    recordFailure(ip);
    /* 拖一下，让暴力尝试变慢 */
    await delay(FAIL_DELAY_MS);

    return fail(401, "密码不正确");
  }

  clearFailures(ip);

  const { token, expiresAt } = await createSessionToken(env);

  return json(
    { ok: true, expiresAt },
    { headers: { "Set-Cookie": sessionCookie(request, token) } }
  );
}
