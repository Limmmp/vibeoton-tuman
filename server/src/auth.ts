// Вход: почта + пароль, соцсети (VK ID, Telegram, Google, Яндекс) и демо-вход для защиты.
// Каждая соцсеть включается своими переменными окружения; без них провайдер отвечает 503.
// Токен сессии случайный, в базе хранится только его SHA-256.
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export type Provider = "vk" | "telegram" | "google" | "yandex";
export type ExternalProfile = { provider: Provider; id: string; name: string; email?: string };

export class AuthError extends Error {
  readonly status: 400 | 401 | 403 | 409 | 503;
  readonly code: string;
  constructor(status: 400 | 401 | 403 | 409 | 503, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

// ---------- пароли и токены ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored?.startsWith("scrypt$")) return false;
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(actual, expected);
}

export const newToken = () => randomBytes(32).toString("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const newId = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}`;

/** Код для добавления в друзья: 6 символов без похожих (0/O, 1/I). */
export function friendCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

// ---------- соцсети ----------

type Fetch = typeof fetch;
const env = (key: string) => process.env[key]?.trim() || "";

export function configuredProviders(): Provider[] {
  return (["vk", "telegram", "google", "yandex"] as const).filter((p) =>
    p === "vk" ? !!env("VK_CLIENT_ID") : p === "telegram" ? !!env("TELEGRAM_BOT_TOKEN") : p === "google" ? !!env("GOOGLE_CLIENT_IDS") : !!env("YANDEX_CLIENT_ID"));
}

function notConfigured(provider: Provider): never {
  throw new AuthError(503, "provider_not_configured", `Вход через ${provider} ещё не настроен на сервере`);
}

/** Проверка данных виджета Telegram Login: HMAC-SHA256 от отсортированных полей, ключ — SHA-256 токена бота. */
export function verifyTelegram(data: Record<string, string | number>, botToken = env("TELEGRAM_BOT_TOKEN"), nowSec = Math.floor(Date.now() / 1000)): ExternalProfile {
  if (!botToken) notConfigured("telegram");
  const { hash, ...fields } = data;
  if (typeof hash !== "string") throw new AuthError(400, "bad_request", "Нет подписи Telegram");
  const check = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(check).digest("hex");
  if (expected.length !== hash.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) throw new AuthError(401, "bad_signature", "Подпись Telegram не сошлась");
  if (nowSec - Number(fields.auth_date) > 86400) throw new AuthError(401, "expired", "Данные Telegram устарели, войдите ещё раз");
  const name = [fields.first_name, fields.last_name].filter(Boolean).join(" ") || String(fields.username || "Житель");
  return { provider: "telegram", id: String(fields.id), name };
}

/** Профиль по токену соцсети. Токен получает приложение (OAuth / SDK), сервер проверяет его у провайдера. */
export async function externalProfile(provider: Provider, body: Record<string, unknown>, f: Fetch = fetch): Promise<ExternalProfile> {
  if (provider === "telegram") return verifyTelegram(body as Record<string, string | number>);
  const token = String(body.token ?? body.access_token ?? body.idToken ?? "");
  if (!token) throw new AuthError(400, "bad_request", "Нет токена соцсети");
  if (provider === "google") {
    const ids = env("GOOGLE_CLIENT_IDS").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) notConfigured("google");
    const r = await f(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    const j = await r.json() as { aud?: string; sub?: string; name?: string; email?: string; email_verified?: string };
    if (!r.ok || !j.sub || !ids.includes(j.aud ?? "")) throw new AuthError(401, "bad_token", "Google не подтвердил вход");
    return { provider, id: j.sub, name: j.name || j.email?.split("@")[0] || "Житель", email: j.email_verified === "true" ? j.email : undefined };
  }
  if (provider === "yandex") {
    // Токен должен быть выдан именно нашему приложению: иначе подошёл бы токен любого чужого сервиса.
    const clientId = env("YANDEX_CLIENT_ID");
    if (!clientId) notConfigured("yandex");
    const r = await f("https://login.yandex.ru/info?format=json", { headers: { Authorization: `OAuth ${token}` } });
    const j = await r.json() as { id?: string; client_id?: string; display_name?: string; real_name?: string; default_email?: string };
    if (!r.ok || !j.id || j.client_id !== clientId) throw new AuthError(401, "bad_token", "Яндекс не подтвердил вход");
    return { provider, id: j.id, name: j.display_name || j.real_name || "Житель", email: j.default_email };
  }
  // VK ID: обмен access_token на профиль, https://id.vk.com/about/business/go/docs
  const clientId = env("VK_CLIENT_ID");
  if (!clientId) notConfigured("vk");
  const r = await f("https://id.vk.com/oauth2/user_info", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, access_token: token }) });
  const j = await r.json() as { user?: { user_id?: string; first_name?: string; last_name?: string; email?: string } };
  if (!r.ok || !j.user?.user_id) throw new AuthError(401, "bad_token", "VK ID не подтвердил вход");
  return { provider, id: String(j.user.user_id), name: [j.user.first_name, j.user.last_name].filter(Boolean).join(" ") || "Житель", email: j.user.email };
}
