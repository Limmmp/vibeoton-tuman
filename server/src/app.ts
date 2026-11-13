// HTTP API «Тумана». Контракт описан в docs/backend-api.md.
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { readFileSync } from "node:fs";
import { now, type DB } from "./db.ts";
import { AuthError, configuredProviders, externalProfile, friendCode, hashPassword, newId, newToken, tokenHash, verifyPassword, type ExternalProfile, type Provider } from "./auth.ts";
import { BUDGET_MODES, budgetLabel, planBudget, type BudgetMode } from "./budget.ts";
import { INTERESTS, matchGroup, type Interest, type Member } from "../../src/match/matchGroup.ts";
import type { Place } from "../../src/data/place.ts";

type Vars = { userId: string };
type C = Context<{ Variables: Vars }>;
type Row = Record<string, unknown>;

const SESSION_DAYS = 90;
const AVATAR_GLYPHS = ["lighthouse", "gull", "anchor", "wave", "hill", "cat", "tiger", "star", "bridge", "compass"] as const;
const AVATAR_COLORS = ["#F5B83D", "#4CC2B5", "#FF7A6B", "#7C9CFF", "#5BC07A", "#C58BF2", "#F2A65A", "#9AA8B3"] as const;

class HttpError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 409 | 429;
  readonly code: string;
  constructor(status: 400 | 401 | 403 | 404 | 409 | 429, code: string, message: string) { super(message); this.status = status; this.code = code; }
}
const fail = (status: HttpError["status"], code: string, message: string): never => { throw new HttpError(status, code, message); };

// ---------- проверка входных данных ----------

const str = (v: unknown, field: string, min = 1, max = 80): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < min || s.length > max) fail(400, "bad_request", `${field}: от ${min} до ${max} символов`);
  return s;
};
const int = (v: unknown, field: string, min: number, max: number): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(400, "bad_request", `${field}: целое от ${min} до ${max}`);
  return n;
};
const iso = (v: unknown, field: string): string => {
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) fail(400, "bad_request", `${field}: дата в формате ISO`);
  return d.toISOString();
};
const interestsOf = (v: unknown): Interest[] => (Array.isArray(v) ? v.filter((x): x is Interest => typeof x === "string" && x in INTERESTS).slice(0, 5) : []);
const json = <T>(s: unknown, fallback: T): T => { try { return JSON.parse(String(s)) as T; } catch { return fallback; } };

function avatarOf(v: unknown, seed: string) {
  const a = (v && typeof v === "object" ? v : {}) as { glyph?: string; color?: string };
  const h = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return {
    glyph: (AVATAR_GLYPHS as readonly string[]).includes(a.glyph ?? "") ? a.glyph! : AVATAR_GLYPHS[h % AVATAR_GLYPHS.length],
    color: (AVATAR_COLORS as readonly string[]).includes(a.color ?? "") ? a.color! : AVATAR_COLORS[h % AVATAR_COLORS.length],
  };
}

// ---------- приложение ----------

export type AppOptions = { db: DB; places?: Place[]; devLogin?: boolean; seedDemo?: boolean; fetch?: typeof fetch };

export function loadPlaces(path: string): Place[] {
  return JSON.parse(readFileSync(path, "utf8")) as Place[];
}

export function createApp({ db, places = [], devLogin = false, seedDemo = false, fetch: f = fetch }: AppOptions) {
  const app = new Hono<{ Variables: Vars }>();
  const placeById = new Map(places.map((p) => [p.id, p]));
  const q = (sql: string) => db.prepare(sql);

  // ----- пользователи -----

  const translit: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
  function uniqueHandle(name: string): string {
    const base = [...name.toLowerCase()].map((ch) => translit[ch] ?? ch).join("").replace(/[^a-z0-9]+/g, "").slice(0, 14) || "tuman";
    for (let i = 0; i < 50; i++) {
      const handle = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 9900)}`;
      if (!q("SELECT 1 FROM users WHERE handle = ?").get(handle)) return handle;
    }
    return `${base}${Date.now() % 100000}`;
  }
  function createUser(name: string, extra: { email?: string; passwordHash?: string; handle?: string } = {}): string {
    const id = newId("u");
    let code = friendCode();
    while (q("SELECT 1 FROM users WHERE friend_code = ?").get(code)) code = friendCode();
    q("INSERT INTO users (id, name, handle, email, password_hash, avatar, friend_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, name, extra.handle ?? uniqueHandle(name), extra.email ?? null, extra.passwordHash ?? null, JSON.stringify(avatarOf(null, id)), code, now());
    return id;
  }
  function publicUser(row: Row | undefined) {
    if (!row) return null;
    return { id: row.id as string, name: row.name as string, handle: row.handle as string, avatar: avatarOf(json(row.avatar, {}), row.id as string) };
  }
  function me(userId: string) {
    const row = q("SELECT * FROM users WHERE id = ?").get(userId) as Row | undefined;
    if (!row) fail(401, "unauthorized", "Сессия недействительна");
    const providers = (q("SELECT provider FROM identities WHERE user_id = ?").all(userId) as Row[]).map((r) => r.provider as string);
    return { ...publicUser(row)!, email: (row!.email as string | null) ?? null, friendCode: row!.friend_code as string, interests: json<string[]>(row!.interests, []), providers: [...(row!.password_hash ? ["email"] : []), ...providers] };
  }
  function session(userId: string) {
    const token = newToken();
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
    q("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(tokenHash(token), userId, now(), expires);
    return { token, expiresAt: expires, user: me(userId) };
  }

  // ----- друзья -----

  const pair = (x: string, y: string) => (x < y ? [x, y] : [y, x]) as [string, string];
  const areFriends = (x: string, y: string) => !!q("SELECT 1 FROM friendships WHERE a = ? AND b = ? AND status = 'accepted'").get(...pair(x, y));
  function befriend(x: string, y: string) {
    const [a, b] = pair(x, y);
    q("INSERT INTO friendships (a, b, status, requested_by, created_at) VALUES (?, ?, 'accepted', ?, ?) ON CONFLICT(a, b) DO UPDATE SET status = 'accepted'").run(a, b, x, now());
  }

  // ----- демо-данные для защиты -----

  const DEMO = [["Петя", "petya", "boardgames,coffee", 300, "cat"], ["Маша", "masha", "sea,views,coffee", 2000, "gull"], ["Аня", "anya", "art,history,study", 500, "lighthouse"]] as const;
  function seed() {
    for (const [name, handle, interests, , glyph] of DEMO) {
      if (q("SELECT 1 FROM users WHERE handle = ?").get(handle)) continue;
      const id = createUser(name, { handle });
      q("UPDATE users SET interests = ?, avatar = ? WHERE id = ?").run(JSON.stringify(interests.split(",")), JSON.stringify(avatarOf({ glyph }, id)), id);
    }
  }
  if (seedDemo) seed();
  const demoIds = () => (q(`SELECT id FROM users WHERE handle IN (${DEMO.map(() => "?").join(",")})`).all(...DEMO.map((d) => d[1])) as Row[]).map((r) => r.id as string);

  // ----- встречи -----

  function meetingView(id: string, viewer: string) {
    const m = q("SELECT * FROM meetings WHERE id = ?").get(id) as Row | undefined;
    if (!m) fail(404, "not_found", "Встреча не найдена");
    const rows = q("SELECT mm.*, u.name, u.handle, u.avatar, u.id AS uid FROM meeting_members mm JOIN users u ON u.id = mm.user_id WHERE mm.meeting_id = ? ORDER BY u.name").all(id) as Row[];
    if (!rows.some((r) => r.user_id === viewer)) fail(403, "forbidden", "Вы не участник этой встречи");
    const active = rows.filter((r) => r.rsvp !== "declined");
    const plan = planBudget(m!.budget_mode as BudgetMode, active.map((r) => ({ userId: r.user_id as string, budget: r.budget as number })), m!.fixed_budget as number | null);
    const votes = q("SELECT place_id, SUM(value) AS score, COUNT(*) AS n FROM votes WHERE meeting_id = ? GROUP BY place_id").all(id) as Row[];
    const myVotes = Object.fromEntries((q("SELECT place_id, value FROM votes WHERE meeting_id = ? AND user_id = ?").all(id, viewer) as Row[]).map((r) => [r.place_id, r.value]));
    return {
      id, title: m!.title, ownerId: m!.owner_id, partyId: m!.party_id, startsAt: m!.starts_at, endsAt: m!.ends_at,
      budgetMode: m!.budget_mode, fixedBudget: m!.fixed_budget, indoorOnly: !!m!.indoor_only, status: m!.status,
      place: m!.place_id ? placeById.get(m!.place_id as string) ?? { id: m!.place_id } : null,
      budget: { perPerson: plan.perPerson, total: plan.total, label: budgetLabel(plan), shortfall: plan.shortfall },
      members: rows.map((r) => ({
        user: publicUser({ id: r.uid, name: r.name, handle: r.handle, avatar: r.avatar }),
        rsvp: r.rsvp, interests: json<string[]>(r.interests, []), noClimb: !!r.no_climb, mood: r.mood,
        // Сумму видит только сам участник; остальным — достаточно ли её.
        budget: r.user_id === viewer ? r.budget : undefined,
        enough: m!.budget_mode !== "fixed" || (r.budget as number) >= (m!.fixed_budget as number ?? 0),
      })),
      votes: Object.fromEntries(votes.map((v) => [v.place_id, { score: v.score, count: v.n }])), myVotes,
    };
  }
  function memberOf(meetingId: string, userId: string) {
    if (!q("SELECT 1 FROM meeting_members WHERE meeting_id = ? AND user_id = ?").get(meetingId, userId)) fail(403, "forbidden", "Вы не участник этой встречи");
  }

  // ---------- маршруты ----------

  app.use("*", cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));

  // Простое ограничение частоты для входа: 30 запросов в минуту с адреса.
  const hits = new Map<string, { n: number; t: number }>();
  app.use("/auth/*", async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0].trim() || "local";
    const h = hits.get(ip);
    const t = Date.now();
    if (!h || t - h.t > 60000) hits.set(ip, { n: 1, t });
    else if (++h.n > 30) fail(429, "rate_limited", "Слишком много попыток, подождите минуту");
    await next();
  });

  app.onError((err, c) => {
    if (err instanceof HttpError || err instanceof AuthError) return c.json({ error: err.code, message: err.message }, err.status);
    console.error(err);
    return c.json({ error: "internal", message: "Что-то пошло не так" }, 500);
  });

  app.get("/health", (c) => c.json({ ok: true, providers: ["email", ...configuredProviders()], devLogin, places: places.length }));

  // ----- вход -----

  const body = async (c: C) => { try { return (await c.req.json()) as Record<string, unknown>; } catch { return {}; } };

  app.post("/auth/email/register", async (c) => {
    const b = await body(c);
    const email = str(b.email, "email", 3, 120).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, "bad_request", "Проверьте адрес почты");
    const password = str(b.password, "Пароль", 8, 128);
    const name = str(b.name, "Имя", 1, 40);
    if (q("SELECT 1 FROM users WHERE email = ?").get(email)) fail(409, "email_taken", "Эта почта уже зарегистрирована — войдите");
    return c.json(session(createUser(name, { email, passwordHash: hashPassword(password) })), 201);
  });

  app.post("/auth/email/login", async (c) => {
    const b = await body(c);
    const row = q("SELECT id, password_hash FROM users WHERE email = ?").get(String(b.email ?? "").trim().toLowerCase()) as Row | undefined;
    if (!row || !verifyPassword(String(b.password ?? ""), row.password_hash as string | null)) fail(401, "bad_credentials", "Неверная почта или пароль");
    return c.json(session(row!.id as string));
  });

  app.post("/auth/:provider", async (c) => {
    const provider = c.req.param("provider");
    if (provider === "dev") {
      if (!devLogin) fail(404, "not_found", "Демо-вход выключен");
      const name = str((await body(c)).name, "Имя", 1, 40);
      const id = createUser(name);
      if (seedDemo) for (const friend of demoIds()) befriend(id, friend);
      return c.json(session(id), 201);
    }
    if (!["vk", "telegram", "google", "yandex"].includes(provider)) fail(404, "not_found", "Неизвестный способ входа");
    const profile: ExternalProfile = await externalProfile(provider as Provider, await body(c), f);
    const linked = q("SELECT user_id FROM identities WHERE provider = ? AND provider_id = ?").get(profile.provider, profile.id) as Row | undefined;
    let userId = linked?.user_id as string | undefined;
    // Аккаунты по почте не склеиваем: почта при регистрации не подтверждается, это путь к захвату чужого
    // аккаунта. Привязка соцсети к существующему аккаунту — отдельной функцией из профиля (после входа).
    if (!userId) {
      const email = profile.email?.toLowerCase();
      const free = email && !q("SELECT 1 FROM users WHERE email = ?").get(email);
      userId = createUser(profile.name, { email: free ? email : undefined });
    }
    q("INSERT OR IGNORE INTO identities (provider, provider_id, user_id) VALUES (?, ?, ?)").run(profile.provider, profile.id, userId);
    return c.json(session(userId), linked ? 200 : 201);
  });

  // Всё ниже — только с токеном.
  const authed = new Hono<{ Variables: Vars }>();
  authed.use("*", async (c, next) => {
    const token = c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const row = token && (q("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(tokenHash(token)) as Row | undefined);
    if (!row || (row.expires_at as string) < now()) fail(401, "unauthorized", "Войдите заново");
    c.set("userId", (row as Row).user_id as string);
    await next();
  });

  authed.post("/auth/logout", (c) => {
    q("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(c.req.header("authorization")!.replace(/^Bearer\s+/i, "")));
    return c.json({ ok: true });
  });

  // ----- профиль -----

  authed.get("/me", (c) => c.json(me(c.get("userId"))));
  authed.patch("/me", async (c) => {
    const id = c.get("userId"), b = await body(c);
    if (b.name !== undefined) q("UPDATE users SET name = ? WHERE id = ?").run(str(b.name, "Имя", 1, 40), id);
    if (b.handle !== undefined) {
      const handle = str(b.handle, "Ник", 3, 20).toLowerCase();
      if (!/^[a-z0-9_]+$/.test(handle)) fail(400, "bad_request", "Ник: латиница, цифры и _");
      const taken = q("SELECT id FROM users WHERE handle = ?").get(handle) as Row | undefined;
      if (taken && taken.id !== id) fail(409, "handle_taken", "Этот ник уже занят");
      q("UPDATE users SET handle = ? WHERE id = ?").run(handle, id);
    }
    if (b.avatar !== undefined) q("UPDATE users SET avatar = ? WHERE id = ?").run(JSON.stringify(avatarOf(b.avatar, id)), id);
    if (b.interests !== undefined) q("UPDATE users SET interests = ? WHERE id = ?").run(JSON.stringify(interestsOf(b.interests)), id);
    return c.json(me(id));
  });

  // ----- друзья -----

  authed.get("/friends", (c) => {
    const id = c.get("userId");
    const rows = q(`SELECT f.status, f.requested_by, u.* FROM friendships f JOIN users u ON u.id = CASE WHEN f.a = ? THEN f.b ELSE f.a END WHERE f.a = ? OR f.b = ? ORDER BY u.name`).all(id, id, id) as Row[];
    return c.json({
      friends: rows.filter((r) => r.status === "accepted").map(publicUser),
      incoming: rows.filter((r) => r.status === "pending" && r.requested_by !== id).map(publicUser),
      outgoing: rows.filter((r) => r.status === "pending" && r.requested_by === id).map(publicUser),
    });
  });

  authed.get("/users/search", (c) => {
    const term = (c.req.query("q") ?? "").trim().toLowerCase().replace(/^@/, "");
    if (term.length < 2) return c.json({ users: [] });
    const rows = q("SELECT * FROM users WHERE (handle LIKE ? OR friend_code = ?) AND id != ? LIMIT 10").all(`${term}%`, term.toUpperCase(), c.get("userId")) as Row[];
    return c.json({ users: rows.map(publicUser) });
  });

  authed.post("/friends/requests", async (c) => {
    const id = c.get("userId"), b = await body(c);
    const key = String(b.code ?? b.handle ?? b.userId ?? "").trim();
    const target = q("SELECT id FROM users WHERE friend_code = ? OR handle = ? OR id = ?").get(key.toUpperCase(), key.toLowerCase().replace(/^@/, ""), key) as Row | undefined;
    if (!target) fail(404, "not_found", "Никого не нашли по этому коду");
    if (target!.id === id) fail(400, "bad_request", "Это ваш собственный код");
    const [a, bb] = pair(id, target!.id as string);
    const existing = q("SELECT status, requested_by FROM friendships WHERE a = ? AND b = ?").get(a, bb) as Row | undefined;
    if (existing?.status === "accepted") return c.json({ status: "accepted" });
    if (existing && existing.requested_by !== id) { befriend(id, target!.id as string); return c.json({ status: "accepted" }); }
    if (!existing) q("INSERT INTO friendships (a, b, status, requested_by, created_at) VALUES (?, ?, 'pending', ?, ?)").run(a, bb, id, now());
    return c.json({ status: "pending" }, 201);
  });

  authed.post("/friends/requests/:userId/:action", (c) => {
    const id = c.get("userId"), other = c.req.param("userId"), action = c.req.param("action");
    const [a, b] = pair(id, other);
    const row = q("SELECT requested_by FROM friendships WHERE a = ? AND b = ? AND status = 'pending'").get(a, b) as Row | undefined;
    if (!row || row.requested_by === id) fail(404, "not_found", "Заявка не найдена");
    if (action === "accept") befriend(id, other);
    else if (action === "decline") q("DELETE FROM friendships WHERE a = ? AND b = ?").run(a, b);
    else fail(404, "not_found", "Неизвестное действие");
    return c.json({ ok: true });
  });

  authed.delete("/friends/:userId", (c) => {
    q("DELETE FROM friendships WHERE a = ? AND b = ?").run(...pair(c.get("userId"), c.req.param("userId")));
    return c.json({ ok: true });
  });

  // ----- пачки (постоянные компании) -----

  function partyView(id: string, viewer: string) {
    const p = q("SELECT * FROM parties WHERE id = ?").get(id) as Row | undefined;
    if (!p) fail(404, "not_found", "Пачка не найдена");
    const members = (q("SELECT u.* FROM party_members pm JOIN users u ON u.id = pm.user_id WHERE pm.party_id = ? ORDER BY pm.joined_at").all(id) as Row[]).map(publicUser);
    if (!members.some((m) => m!.id === viewer)) fail(403, "forbidden", "Вы не в этой пачке");
    return { id, name: p!.name, ownerId: p!.owner_id, members };
  }
  const requireFriends = (owner: string, ids: string[]) => {
    for (const u of ids) if (u !== owner && !areFriends(owner, u)) fail(403, "not_friends", "Позвать можно только друзей");
  };

  authed.get("/parties", (c) => {
    const ids = (q("SELECT party_id FROM party_members WHERE user_id = ?").all(c.get("userId")) as Row[]).map((r) => r.party_id as string);
    return c.json({ parties: ids.map((id) => partyView(id, c.get("userId"))) });
  });
  authed.post("/parties", async (c) => {
    const owner = c.get("userId"), b = await body(c);
    const memberIds = [...new Set([owner, ...(Array.isArray(b.memberIds) ? b.memberIds.map(String) : [])])].slice(0, 20);
    requireFriends(owner, memberIds);
    const id = newId("p");
    q("INSERT INTO parties (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").run(id, str(b.name ?? "Моя пачка", "Название", 1, 40), owner, now());
    for (const u of memberIds) q("INSERT INTO party_members (party_id, user_id, joined_at) VALUES (?, ?, ?)").run(id, u, now());
    return c.json(partyView(id, owner), 201);
  });
  authed.post("/parties/:id/members", async (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), party = partyView(id, viewer), b = await body(c);
    const ids = Array.isArray(b.userIds) ? b.userIds.map(String) : [];
    requireFriends(viewer, ids);
    for (const u of ids) q("INSERT OR IGNORE INTO party_members (party_id, user_id, joined_at) VALUES (?, ?, ?)").run(party.id, u, now());
    return c.json(partyView(id, viewer));
  });
  authed.delete("/parties/:id/members/:userId", (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), target = c.req.param("userId"), party = partyView(id, viewer);
    if (target !== viewer && party.ownerId !== viewer) fail(403, "forbidden", "Убирать участников может только создатель");
    q("DELETE FROM party_members WHERE party_id = ? AND user_id = ?").run(id, target);
    return c.json({ ok: true });
  });

  // ----- встречи -----

  authed.get("/meetings", (c) => {
    const ids = (q("SELECT m.id FROM meetings m JOIN meeting_members mm ON mm.meeting_id = m.id WHERE mm.user_id = ? AND m.status != 'cancelled' ORDER BY m.starts_at").all(c.get("userId")) as Row[]).map((r) => r.id as string);
    return c.json({ meetings: ids.map((id) => meetingView(id, c.get("userId"))) });
  });

  authed.post("/meetings", async (c) => {
    const owner = c.get("userId"), b = await body(c);
    const mode = String(b.budgetMode ?? "individual") as BudgetMode;
    if (!(BUDGET_MODES as readonly string[]).includes(mode)) fail(400, "bad_request", "budgetMode: individual | pooled | fixed");
    const fixed = mode === "fixed" ? int(b.fixedBudget, "Сумма на человека", 0, 100000) : null;
    const startsAt = iso(b.startsAt, "startsAt"), endsAt = iso(b.endsAt, "endsAt");
    if (endsAt <= startsAt) fail(400, "bad_request", "Конец встречи должен быть позже начала");
    let memberIds = Array.isArray(b.memberIds) ? b.memberIds.map(String) : [];
    const partyId = b.partyId ? String(b.partyId) : null;
    if (partyId) memberIds = partyView(partyId, owner).members.map((m) => m!.id);
    memberIds = [...new Set([owner, ...memberIds])].slice(0, 20);
    requireFriends(owner, memberIds);
    const id = newId("m");
    q("INSERT INTO meetings (id, party_id, owner_id, title, starts_at, ends_at, budget_mode, fixed_budget, indoor_only, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, partyId, owner, str(b.title ?? "Встреча", "Название", 1, 60), startsAt, endsAt, mode, fixed, b.indoorOnly ? 1 : 0, now());
    const ownerBudget = b.myBudget !== undefined ? int(b.myBudget, "Ваш бюджет", 0, 100000) : fixed ?? 0;
    for (const u of memberIds) {
      const prefs = q("SELECT interests FROM users WHERE id = ?").get(u) as Row;
      q("INSERT INTO meeting_members (meeting_id, user_id, rsvp, budget, interests) VALUES (?, ?, ?, ?, ?)")
        .run(id, u, u === owner ? "going" : "invited", u === owner ? ownerBudget : fixed ?? 0, String(prefs?.interests ?? "[]"));
    }
    return c.json(meetingView(id, owner), 201);
  });

  authed.get("/meetings/:id", (c) => c.json(meetingView(c.req.param("id"), c.get("userId"))));

  authed.patch("/meetings/:id", async (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), b = await body(c);
    const m = meetingView(id, viewer);
    if (m.ownerId !== viewer) fail(403, "forbidden", "Менять встречу может только создатель");
    if (b.title !== undefined) q("UPDATE meetings SET title = ? WHERE id = ?").run(str(b.title, "Название", 1, 60), id);
    if (b.budgetMode !== undefined) {
      const mode = String(b.budgetMode);
      if (!(BUDGET_MODES as readonly string[]).includes(mode)) fail(400, "bad_request", "budgetMode: individual | pooled | fixed");
      q("UPDATE meetings SET budget_mode = ?, fixed_budget = ? WHERE id = ?").run(mode, mode === "fixed" ? int(b.fixedBudget, "Сумма на человека", 0, 100000) : null, id);
    }
    if (b.startsAt !== undefined || b.endsAt !== undefined) {
      const s = iso(b.startsAt ?? m.startsAt, "startsAt"), e = iso(b.endsAt ?? m.endsAt, "endsAt");
      if (e <= s) fail(400, "bad_request", "Конец встречи должен быть позже начала");
      q("UPDATE meetings SET starts_at = ?, ends_at = ? WHERE id = ?").run(s, e, id);
    }
    if (b.indoorOnly !== undefined) q("UPDATE meetings SET indoor_only = ? WHERE id = ?").run(b.indoorOnly ? 1 : 0, id);
    if (b.status === "cancelled") q("UPDATE meetings SET status = 'cancelled' WHERE id = ?").run(id);
    return c.json(meetingView(id, viewer));
  });

  // Ответ участника: иду/не иду, свой бюджет и пожелания.
  authed.post("/meetings/:id/rsvp", async (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), b = await body(c);
    memberOf(id, viewer);
    if (b.rsvp !== undefined) {
      if (!["going", "declined", "invited"].includes(String(b.rsvp))) fail(400, "bad_request", "rsvp: going | declined");
      q("UPDATE meeting_members SET rsvp = ? WHERE meeting_id = ? AND user_id = ?").run(String(b.rsvp), id, viewer);
    }
    if (b.budget !== undefined) q("UPDATE meeting_members SET budget = ? WHERE meeting_id = ? AND user_id = ?").run(int(b.budget, "Бюджет", 0, 100000), id, viewer);
    if (b.interests !== undefined) q("UPDATE meeting_members SET interests = ? WHERE meeting_id = ? AND user_id = ?").run(JSON.stringify(interestsOf(b.interests)), id, viewer);
    if (b.noClimb !== undefined) q("UPDATE meeting_members SET no_climb = ? WHERE meeting_id = ? AND user_id = ?").run(b.noClimb ? 1 : 0, id, viewer);
    if (b.mood !== undefined) q("UPDATE meeting_members SET mood = ? WHERE meeting_id = ? AND user_id = ?").run(b.mood === "active" ? "active" : "calm", id, viewer);
    return c.json(meetingView(id, viewer));
  });

  // Подбор мест тем же алгоритмом, что в приложении, с учётом режима бюджета.
  authed.post("/meetings/:id/suggest", async (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), b = await body(c);
    const m = meetingView(id, viewer);
    const rows = q("SELECT mm.*, u.name FROM meeting_members mm JOIN users u ON u.id = mm.user_id WHERE mm.meeting_id = ? AND mm.rsvp != 'declined'").all(id) as Row[];
    const plan = planBudget(m.budgetMode as BudgetMode, rows.map((r) => ({ userId: r.user_id as string, budget: r.budget as number })), m.fixedBudget as number | null);
    const members: Member[] = rows.map((r) => ({
      name: r.name as string, interests: interestsOf(json(r.interests, [])), budget: plan.effective.get(r.user_id as string) ?? 0,
      window: { start: m.startsAt as string, end: m.endsAt as string }, noClimb: !!r.no_climb, mood: r.mood === "active" ? "active" : "calm",
    }));
    const out = matchGroup({ members, places, weather: { bad: !!m.indoorOnly || b.weatherBad === true } });
    return c.json({ budget: m.budget, window: out.window, hints: out.hints, results: out.results.map((r) => ({ place: r.place, price: r.price, reason: r.reason, flags: r.flags, travel: r.travel, score: Math.round(r.score * 100) / 100 })) });
  });

  authed.post("/meetings/:id/votes", async (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), b = await body(c);
    memberOf(id, viewer);
    const placeId = str(b.placeId, "placeId", 1, 80);
    if (b.value === 0 || b.value === null) q("DELETE FROM votes WHERE meeting_id = ? AND user_id = ? AND place_id = ?").run(id, viewer, placeId);
    else q("INSERT INTO votes (meeting_id, user_id, place_id, value) VALUES (?, ?, ?, ?) ON CONFLICT DO UPDATE SET value = excluded.value").run(id, viewer, placeId, Number(b.value) > 0 ? 1 : -1);
    return c.json(meetingView(id, viewer));
  });

  authed.post("/meetings/:id/choose", async (c) => {
    const id = c.req.param("id"), viewer = c.get("userId"), b = await body(c);
    if (meetingView(id, viewer).ownerId !== viewer) fail(403, "forbidden", "Выбрать место может только создатель");
    const placeId = str(b.placeId, "placeId", 1, 80);
    if (places.length && !placeById.has(placeId)) fail(404, "not_found", "Такого места нет в каталоге");
    q("UPDATE meetings SET place_id = ?, status = 'chosen' WHERE id = ?").run(placeId, id);
    return c.json(meetingView(id, viewer));
  });

  app.route("/", authed);
  return app;
}
