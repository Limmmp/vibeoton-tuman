import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Place } from '../src/data/place.ts';
import { meetingView, validatePreferences, type GroupPlan, type MeetingPreferences } from '../src/social/meeting.ts';

export function lanPlugin(places: Place[] = JSON.parse(readFileSync(new URL('../data/places.json', import.meta.url), 'utf8'))): Plugin {
  // Ключ Map — секрет сессии. Публичный id никогда не используется как токен.
  const clients = new Map<string, { id: string; name: string; lat: number; lon: number; group: string; seen: number; preferences: MeetingPreferences | null }>();
  const groups = new Map<string, GroupPlan>();
  return { name: 'lan-session', configureServer(server) {
    server.middlewares.use('/lan', async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method !== 'POST') { res.statusCode = 405; res.end('{}'); return; }
      try {
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 4096) throw Error('Слишком большой запрос'); }
        const data = JSON.parse(body);
        const now = Date.now();
        for (const [id, client] of clients) if (now - client.seen > 15000) clients.delete(id);
        for (const [code, group] of groups) {
          const members = [...clients.values()].filter(p => p.group === code);
          if (!members.length) groups.delete(code);
          else if (!members.some(p => p.id === group.ownerId)) group.ownerId = members[0].id;
        }
        if (!Number.isFinite(data.lat) || Math.abs(data.lat) > 90 || !Number.isFinite(data.lon) || Math.abs(data.lon) > 180) throw Error('Неверные координаты');
        let token = typeof data.token === 'string' ? data.token : '';
        let client = clients.get(token);
        if (!client) {
          if (clients.size >= 64) throw Error('Сессия заполнена');
          token = randomUUID();
          client = { id: randomUUID(), name: '', lat: 0, lon: 0, group: '', seen: now, preferences: null }; clients.set(token, client);
        }
        client.lat = data.lat; client.lon = data.lon; client.seen = now;
        client.name = String(data.name || 'Игрок').slice(0, 40);
        if (['create', 'join', 'preferences'].includes(data.action)) {
          // Старые клиенты могут создать сессию без анкеты; подбор ждёт заполнения всех анкет.
          if (data.preferences != null) {
            const preferences = validatePreferences(data.preferences, places);
            if (data.action === 'preferences' && !client.group) throw Error('Сначала вступи в группу');
            client.preferences = preferences;
          }
        }
        if (data.action === 'create') {
          let code: string;
          do { code = randomUUID().slice(0, 8).toUpperCase(); } while (groups.has(code));
          groups.set(code, { ownerId: client.id, mode: 'individual', fixed: 500, placeId: null, meetingAt: null });
          client.group = code;
        }
        if (data.action === 'leave') client.group = '';
        if (data.action === 'join') {
          const code = String(data.code || '').trim().toUpperCase();
          if (!groups.has(code)) throw Error('Группа не найдена');
          if ([...clients.values()].filter(p => p.group === code).length >= 16 && client.group !== code) throw Error('В группе уже 16 участников');
          client.group = code;
        }
        const plan = groups.get(client.group);
        const members = [...clients.values()].filter(p => p.group === client.group);
        if (['plan', 'choose', 'schedule'].includes(data.action)) {
          if (!plan || plan.ownerId !== client.id) throw Error('Изменять общий план может создатель группы');
          if (data.action === 'plan') {
            if (!['individual', 'pooled', 'fixed'].includes(data.mode)) throw Error('Неизвестный режим бюджета');
            if (!Number.isSafeInteger(data.fixed) || data.fixed < 0 || data.fixed > 1_000_000) throw Error('Неверная фиксированная сумма');
            plan.mode = data.mode; plan.fixed = data.fixed;
          }
          if (data.action === 'choose') {
            const offered = meetingView(plan, members, client.id, places).output.results;
            if (!offered.some(r => r.place.id === data.placeId)) throw Error('Место больше не подходит группе. Обнови подбор.');
            plan.placeId = data.placeId;
          }
          if (data.action === 'schedule') {
            const window = meetingView(plan, members, client.id, places).output.window;
            const at = typeof data.meetingAt === 'string' ? Date.parse(data.meetingAt) : NaN;
            if (!window || !Number.isFinite(at) || at < Date.parse(window.start) || at >= Date.parse(window.end)) throw Error('Время встречи должно попадать в общее свободное окно');
            plan.meetingAt = new Date(at).toISOString();
          }
        }
        res.end(JSON.stringify({ token, id: client.id, group: client.group,
          meeting: plan ? meetingView(plan, members, client.id, places) : null,
          players: [...clients.values()].filter(p => p.id !== client.id).map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, relation: client.group && p.group === client.group ? 'party' : 'public' })),
        }));
      } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: (error as Error).message })); }
    });
  } };
}
