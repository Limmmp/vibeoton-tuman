import type { Plugin } from 'vite';
import { randomUUID } from 'node:crypto';

export function lanPlugin(): Plugin {
  const clients = new Map<string, { id: string; name: string; lat: number; lon: number; group: string; seen: number }>();
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
        if (!Number.isFinite(data.lat) || Math.abs(data.lat) > 90 || !Number.isFinite(data.lon) || Math.abs(data.lon) > 180) throw Error('Неверные координаты');
        let client = clients.get(data.token);
        if (!client) { client = { id: randomUUID(), name: '', lat: 0, lon: 0, group: '', seen: now }; clients.set(client.id, client); }
        client.lat = data.lat; client.lon = data.lon; client.seen = now;
        client.name = String(data.name || 'Игрок').slice(0, 40);
        if (data.action === 'create') client.group = randomUUID().slice(0, 8).toUpperCase();
        if (data.action === 'leave') client.group = '';
        if (data.action === 'join') {
          const code = String(data.code || '').trim().toUpperCase();
          if (![...clients.values()].some(p => p.group === code && code)) throw Error('Группа не найдена');
          client.group = code;
        }
        res.end(JSON.stringify({ token: client.id, group: client.group, players: [...clients.values()].filter(p => p.id !== client.id).map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, relation: client.group && p.group === client.group ? 'party' : 'public' })) }));
      } catch (error) { res.statusCode = 400; res.end(JSON.stringify({ error: (error as Error).message })); }
    });
  } };
}
