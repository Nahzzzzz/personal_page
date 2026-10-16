/* ============================================================
   接口通用工具：统一响应格式、读取请求体、深合并、非法键拦截
   ============================================================ */

const MAX_BODY_BYTES = 256 * 1024;

/* 已知状态码的错误，中间件会直接把它翻成响应，不当作 500 处理 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/* 值的「种类」，用来判断覆盖方给的类型对不对 */
export function kindOf(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value === "object" ? "object" : "scalar";
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  /* 内容会被后台随时改，不能让浏览器或中间层缓存住 */
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");

  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers,
  });
}

export function fail(status, message, detail) {
  const body = { error: message };
  if (detail !== undefined) body.detail = detail;
  return json(body, { status });
}

/* 读并解析 JSON 请求体，同时卡住体积上限 */
export async function readJson(request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, "请求体过大");

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "请求体过大");
  if (!text.trim()) throw new HttpError(400, "请求体是空的");

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new HttpError(400, "请求体不是合法 JSON");
  }
}

/* 深合并，数组整体替换。
   和前台 public/assets/js/util.js 里的 deepMerge 保持同一套语义：
   1. 列表的增删和顺序只由覆盖方决定，不做逐项合并；
   2. 已有值的路径只接受同类覆盖，类型不对就保留原值。

   第 2 条配合下面的 assertKindConsistent 使用：正常请求会先被拦下来报 400，
   万一有脏数据已经进了库，合并这一步也不会把它渲染到页面上。 */
export function deepMerge(base, override) {
  if (override === undefined) return base;
  if (base === undefined || base === null) return override;

  if (!isPlainObject(base)) {
    return kindOf(base) === kindOf(override) ? override : base;
  }

  if (!isPlainObject(override)) return base;

  const output = { ...base };

  for (const key of Object.keys(override)) {
    output[key] = deepMerge(base[key], override[key]);
  }

  return output;
}

/* 存量内容里已经有的路径，补丁不许改它的类型。
   比如 hero 已经是对象，就不接受 {"hero": "……"} 这种一下子把整块换掉的写法
   —— 否则页面上这个区块会整片变空。 */
export function assertKindConsistent(current, patch, path = "") {
  if (!isPlainObject(patch)) return;

  for (const key of Object.keys(patch)) {
    const where = path ? `${path}.${key}` : key;

    /* 存量里没有这个键就没有参照，放过 */
    if (!isPlainObject(current) || !(key in current)) continue;

    const before = kindOf(current[key]);
    const after = kindOf(patch[key]);

    if (before !== after) {
      throw new HttpError(400, `${where} 原本是 ${before}，不能用 ${after} 覆盖`);
    }

    assertKindConsistent(current[key], patch[key], where);
  }
}

/* 补丁只允许普通对象，并且不能出现能污染原型链的键。
   JSON.parse 会把 "__proto__" 解析成普通自有属性，赋值时才会触发原型 setter，
   所以在合并之前先整体拒掉。 */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function assertSafePayload(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafePayload(item, `${path}.${index}`));
    return;
  }

  if (!isPlainObject(value)) return;

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new HttpError(400, `字段名不允许：${path ? path + "." : ""}${key}`);
    }
    assertSafePayload(value[key], path ? `${path}.${key}` : key);
  }
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown"
  );
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
