import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createApp, loadPlaces } from "../src/app.ts";
import { openDb } from "../src/db.ts";
import { verifyTelegram } from "../src/auth.ts";

const places = loadPlaces(new URL("../../data/places.json", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

function setup(opts: { devLogin?: boolean; seedDemo?: boolean; fetch?: typeof fetch } = {}) {
  const app = createApp({ db: openDb(":memory:"), places, devLogin: true, seedDemo: true, ...opts });
  const call = async (method: string, path: string, body?: unknown, token?: string) => {
    const res = await app.request(path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() as any };
  };
  return { app, call };
}

test("почта: регистрация, повтор, вход, неверный пароль, профиль", async () => {
  const { call } = setup();
  const reg = await call("POST", "/auth/email/register", { email: "Ann@Example.com", password: "tuman-2026", name: "Аня" });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.user.email, "ann@example.com");
  assert.match(reg.body.user.friendCode, /^[A-Z2-9]{6}$/);
  assert.equal((await call("POST", "/auth/email/register", { email: "ann@example.com", password: "another-pass", name: "Аня" })).status, 409);
  assert.equal((await call("POST", "/auth/email/login", { email: "ann@example.com", password: "wrong-pass" })).status, 401);
  const login = await call("POST", "/auth/email/login", { email: "ann@example.com", password: "tuman-2026" });
  assert.equal(login.status, 200);
  const me = await call("GET", "/me", undefined, login.body.token);
  assert.equal(me.body.name, "Аня");
  assert.deepEqual(me.body.providers, ["email"]);
  assert.equal((await call("GET", "/me")).status, 401);
});

test("короткий пароль и кривая почта отклоняются понятным сообщением", async () => {
  const { call } = setup();
  const r = await call("POST", "/auth/email/register", { email: "a@b.c", password: "123", name: "X" });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /Пароль/);
  assert.equal((await call("POST", "/auth/email/register", { email: "nope", password: "12345678", name: "X" })).status, 400);
});

test("профиль: ник, аватар из набора, интересы; занятый ник — 409", async () => {
  const { call } = setup();
  const a = (await call("POST", "/auth/dev", { name: "Денис" })).body.token;
  const p = await call("PATCH", "/me", { handle: "denis_vl", avatar: { glyph: "tiger", color: "#4CC2B5" }, interests: ["sea", "coffee", "unknown"] }, a);
  assert.equal(p.body.handle, "denis_vl");
  assert.deepEqual(p.body.avatar, { glyph: "tiger", color: "#4CC2B5" });
  assert.deepEqual(p.body.interests, ["sea", "coffee"]);
  const b = (await call("POST", "/auth/dev", { name: "Другой" })).body.token;
  assert.equal((await call("PATCH", "/me", { handle: "denis_vl" }, b)).status, 409);
  assert.equal((await call("PATCH", "/me", { avatar: { glyph: "skull", color: "#000" } }, b)).body.avatar.glyph !== "skull", true);
});

test("друзья: заявка по коду, встречная заявка принимает, поиск по нику", async () => {
  const { call } = setup({ seedDemo: false });
  const a = (await call("POST", "/auth/dev", { name: "Аня" })).body;
  const b = (await call("POST", "/auth/dev", { name: "Борис" })).body;
  assert.equal((await call("POST", "/friends/requests", { code: a.user.friendCode }, a.token)).status, 400);
  assert.equal((await call("POST", "/friends/requests", { code: a.user.friendCode.toLowerCase() }, b.token)).body.status, "pending");
  assert.equal((await call("GET", "/friends", undefined, a.token)).body.incoming[0].name, "Борис");
  assert.equal((await call("POST", "/friends/requests", { userId: b.user.id }, a.token)).body.status, "accepted");
  assert.equal((await call("GET", "/friends", undefined, b.token)).body.friends[0].name, "Аня");
  const found = await call("GET", `/users/search?q=@${a.user.handle.slice(0, 3)}`, undefined, b.token);
  assert.ok(found.body.users.some((u: any) => u.id === a.user.id));
});

test("пачка и встреча: скидываемся, подбор мест, голоса, выбор; чужим — 403", async () => {
  const { call } = setup();
  const me = (await call("POST", "/auth/dev", { name: "Денис" })).body;
  const friends = (await call("GET", "/friends", undefined, me.token)).body.friends;
  assert.deepEqual(friends.map((f: any) => f.name).sort(), ["Аня", "Маша", "Петя"]);
  const party = await call("POST", "/parties", { name: "Сопки", memberIds: friends.map((f: any) => f.id) }, me.token);
  assert.equal(party.status, 201);
  assert.equal(party.body.members.length, 4);
  const start = new Date("2026-11-15T08:00:00Z"), end = new Date("2026-11-15T12:00:00Z");
  const meeting = await call("POST", "/meetings", { title: "Субботний выход", partyId: party.body.id, startsAt: start, endsAt: end, budgetMode: "pooled", myBudget: 1200 }, me.token);
  assert.equal(meeting.status, 201);
  assert.equal(meeting.body.members.length, 4);
  assert.equal(meeting.body.members.find((m: any) => m.user.name === "Петя").budget, undefined); // чужой бюджет скрыт
  const id = meeting.body.id;
  const sug = await call("POST", `/meetings/${id}/suggest`, {}, me.token);
  assert.equal(sug.status, 200);
  assert.ok(sug.body.results.length > 0);
  assert.match(sug.body.budget.label, /Скидываемся/);
  const placeId = sug.body.results[0].place.id;
  const voted = await call("POST", `/meetings/${id}/votes`, { placeId, value: 1 }, me.token);
  assert.deepEqual(voted.body.votes[placeId], { score: 1, count: 1 });
  const chosen = await call("POST", `/meetings/${id}/choose`, { placeId }, me.token);
  assert.equal(chosen.body.status, "chosen");
  assert.equal(chosen.body.place.id, placeId);
  const stranger = (await call("POST", "/auth/dev", { name: "Чужой" })).body.token;
  assert.equal((await call("GET", `/meetings/${id}`, undefined, stranger)).status, 403);
});

test("фиксированный бюджет: участник видит, хватает ли у каждого", async () => {
  const { call } = setup();
  const me = (await call("POST", "/auth/dev", { name: "Денис" })).body;
  const friends = (await call("GET", "/friends", undefined, me.token)).body.friends;
  const m = await call("POST", "/meetings", { title: "Кино", memberIds: [friends[0].id], startsAt: "2026-11-15T09:00:00Z", endsAt: "2026-11-15T11:00:00Z", budgetMode: "fixed", fixedBudget: 500, myBudget: 700 }, me.token);
  assert.equal(m.body.budget.perPerson, 500);
  const friendRow = m.body.members.find((x: any) => x.user.id === friends[0].id);
  assert.equal(friendRow.enough, true); // приглашённому по умолчанию ставится сумма встречи
  assert.equal((await call("POST", "/meetings", { title: "x", memberIds: [], startsAt: "2026-11-15T11:00:00Z", endsAt: "2026-11-15T10:00:00Z" }, me.token)).status, 400);
});

test("позвать можно только друзей", async () => {
  const { call } = setup({ seedDemo: false });
  const a = (await call("POST", "/auth/dev", { name: "А" })).body;
  const b = (await call("POST", "/auth/dev", { name: "Б" })).body;
  assert.equal((await call("POST", "/parties", { name: "x", memberIds: [b.user.id] }, a.token)).status, 403);
});

test("соцсети без ключей отвечают 503, демо-вход выключается", async () => {
  delete process.env.VK_CLIENT_ID;
  const { call } = setup({ devLogin: false });
  assert.equal((await call("POST", "/auth/vk", { token: "x" })).status, 503);
  assert.equal((await call("POST", "/auth/dev", { name: "x" })).status, 404);
  assert.equal((await call("POST", "/auth/myspace", {})).status, 404);
});

test("Яндекс: токен проверяется у провайдера, повторный вход — тот же аккаунт", async () => {
  const fake = (async () => new Response(JSON.stringify({ id: "42", display_name: "Лена", default_email: "lena@ya.ru" }), { status: 200 })) as typeof fetch;
  const { call } = setup({ fetch: fake });
  const first = await call("POST", "/auth/yandex", { token: "t" });
  assert.equal(first.status, 201);
  const second = await call("POST", "/auth/yandex", { token: "t" });
  assert.equal(second.status, 200);
  assert.equal(second.body.user.id, first.body.user.id);
  assert.deepEqual(second.body.user.providers, ["yandex"]);
});

test("Telegram: верная подпись проходит, подделка и старые данные — нет", () => {
  const bot = "123:ABC";
  const fields = { id: 777, first_name: "Дима", username: "dima", auth_date: 1_800_000_000 };
  const check = Object.keys(fields).sort().map((k) => `${k}=${(fields as any)[k]}`).join("\n");
  const hash = createHmac("sha256", createHash("sha256").update(bot).digest()).update(check).digest("hex");
  assert.deepEqual(verifyTelegram({ ...fields, hash }, bot, 1_800_000_100), { provider: "telegram", id: "777", name: "Дима" });
  assert.throws(() => verifyTelegram({ ...fields, first_name: "Хакер", hash }, bot, 1_800_000_100), /Подпись/);
  assert.throws(() => verifyTelegram({ ...fields, hash }, bot, 1_800_200_000), /устарели/);
});
