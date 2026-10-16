/* ============================================================
   POST /api/logout   清掉会话 Cookie
   ============================================================ */

import { clearCookie } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

export async function onRequestPost({ request }) {
  /* Max-Age=0 让浏览器立刻删掉这个 Cookie；会话本身是无状态的，服务端没有东西要清 */
  return json({ ok: true }, { headers: { "Set-Cookie": clearCookie(request) } });
}
