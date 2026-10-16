/* ============================================================
   /api/* 的公共出口
   ============================================================
   统一做两件事：
   1. 把 HttpError 翻译成对应状态码的 JSON，其余异常记日志后返回 500
      —— 不把堆栈丢给客户端，但自己在 wrangler tail 里能看到
   2. 给所有接口响应补上安全相关的头
   ============================================================ */

import { HttpError, fail } from "./_lib/http.js";

export async function onRequest(context) {
  try {
    const response = await context.next();
    const headers = new Headers(response.headers);

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");
    /* 接口内容不该被搜索引擎收录 */
    headers.set("X-Robots-Tag", "noindex");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);

    console.error("[api]", context.request.method, new URL(context.request.url).pathname, error);

    return fail(500, "服务器内部错误，详情见 Cloudflare 的函数日志");
  }
}
