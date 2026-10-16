/* ============================================================
   GET /api/session   问一句「我还登录着吗」
   ============================================================
   后台页面加载时先用它决定显示登录框还是编辑器。
   ============================================================ */

import { readSession } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

export async function onRequestGet({ request, env }) {
  const expiresAt = await readSession(env, request);

  return json({
    authenticated: expiresAt !== null,
    expiresAt,
    configured: Boolean(env.ADMIN_PASSWORD),
  });
}
