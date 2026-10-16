/* ============================================================
   登录会话
   ============================================================
   无状态方案：不存 session 表，浏览器只拿一个 HttpOnly Cookie，
   内容是「过期时间 + HMAC 签名」。服务端验签就能确认没被篡改，
   密码本身不落在任何地方（数据库里也没有）。

   需要的环境变量（在 Cloudflare 里配成加密变量，不要写进仓库）：
     ADMIN_PASSWORD  管理密码
     SESSION_SECRET  签名密钥；不配就退回用 ADMIN_PASSWORD 签名
   ============================================================ */

import { HttpError } from "./http.js";

const COOKIE_NAME = "site_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天
const encoder = new TextEncoder();

/* Cookie 里的内容必须能直接放进请求头，所以用 base64url 而不是 base64 */
function base64Url(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);

  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return base64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

/* 等长摘要之间比较，长度不等也走完全部循环，避免用耗时猜内容 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);

  return diff === 0;
}

/* 先各自做一次摘要再比较，这样两个输入的摘要长度恒定 */
async function sameSecret(a, b) {
  const [left, right] = await Promise.all([hmac("compare", a), hmac("compare", b)]);
  return timingSafeEqual(left, right);
}

function signingKey(env) {
  return env.SESSION_SECRET || env.ADMIN_PASSWORD || "";
}

/* 环境变量没配好时抛出可读的错误，而不是静默放行 */
function assertConfigured(env) {
  if (!env.ADMIN_PASSWORD) {
    throw new HttpError(500, "服务端未配置 ADMIN_PASSWORD，请在 Cloudflare 里设置环境变量");
  }
}

export async function verifyPassword(env, password) {
  assertConfigured(env);
  if (typeof password !== "string" || !password) return false;

  return sameSecret(password, env.ADMIN_PASSWORD);
}

export async function createSessionToken(env, ttlSeconds = SESSION_TTL_SECONDS) {
  assertConfigured(env);

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = await hmac(signingKey(env), `v1|${expiresAt}`);

  return { token: `${expiresAt}.${signature}`, expiresAt };
}

export function readCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;

    const key = part.slice(0, index).trim();
    if (key === name) return decodeURIComponent(part.slice(index + 1).trim());
  }

  return null;
}

/* 校验 Cookie 里的会话，返回过期时间戳或 null */
export async function readSession(env, request) {
  const raw = readCookie(request, COOKIE_NAME);
  if (!raw) return null;

  const separator = raw.indexOf(".");
  if (separator < 0) return null;

  const expiresAt = Number(raw.slice(0, separator));
  const signature = raw.slice(separator + 1);

  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return null;
  if (!env.ADMIN_PASSWORD) return null;

  const expected = await hmac(signingKey(env), `v1|${expiresAt}`);
  if (!timingSafeEqual(signature, expected)) return null;

  return expiresAt;
}

/* 所有写操作都先过这里，没登录直接 401 */
export async function requireSession(env, request) {
  const expiresAt = await readSession(env, request);
  if (!expiresAt) throw new HttpError(401, "登录状态已失效，请重新登录");

  return expiresAt;
}

export function isSecureRequest(request) {
  return new URL(request.url).protocol === "https:";
}

function cookieParts(request, maxAge) {
  const parts = [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAge}`];

  /* 本地开发是 http，带上 Secure 浏览器会直接丢掉这个 Cookie */
  if (isSecureRequest(request)) parts.splice(4, 0, "Secure");

  return parts;
}

export function sessionCookie(request, token, maxAge = SESSION_TTL_SECONDS) {
  const parts = cookieParts(request, maxAge);
  parts[0] = `${COOKIE_NAME}=${token}`;

  return parts.join("; ");
}

export function clearCookie(request) {
  return cookieParts(request, 0).join("; ");
}

export { COOKIE_NAME, SESSION_TTL_SECONDS };
