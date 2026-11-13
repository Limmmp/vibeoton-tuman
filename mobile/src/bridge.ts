import type { Command, EngineEvent } from '../../src/engine/protocol';

type Pending = { command: Command; sent: boolean; resolve: (value: unknown) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

/** One request, one result. Commands wait for the engine's ready event. */
export class MapBridge {
  private ready = false;
  private sequence = 0;
  private pending = new Map<string, Pending>();
  private transport: (raw: string) => void;
  private timeout: number;
  constructor(transport: (raw: string) => void, timeout = 45000) { this.transport = transport; this.timeout = timeout; }

  request<T = unknown>(command: Command): Promise<T> {
    if (this.pending.size >= 100) return Promise.reject(new Error('Слишком много запросов к карте'));
    const id = `mobile-${++this.sequence}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Карта не ответила на ${command.type}. Проверь подключение.`));
      }, this.timeout);
      this.pending.set(id, { command: { ...command, id }, sent: false, resolve: value => resolve(value as T), reject, timer });
      if (this.ready) this.transmit(id);
    });
  }

  receive(raw: string): EngineEvent | null {
    let event: EngineEvent;
    try { event = JSON.parse(raw); } catch { return null; }
    if (!event || typeof event !== 'object' || typeof event.type !== 'string') return null;
    if (event.type === 'ready') {
      if (!event.state?.player || !event.state.fog) return null;
      this.ready = true;
      for (const id of this.pending.keys()) this.transmit(id);
    }
    if (event.type === 'result') {
      const item = this.pending.get(event.id);
      if (item) {
        clearTimeout(item.timer); this.pending.delete(event.id);
        if (event.ok) item.resolve(event.data);
        else item.reject(new Error(event.error || 'Ошибка движка карты'));
      }
    }
    return event;
  }

  disconnect(message = 'Подключение к карте закрыто') {
    this.ready = false;
    for (const item of this.pending.values()) { clearTimeout(item.timer); item.reject(new Error(message)); }
    this.pending.clear();
  }

  private transmit(id: string) {
    const item = this.pending.get(id);
    if (!item || item.sent) return;
    item.sent = true;
    try { this.transport(JSON.stringify(item.command)); }
    catch { clearTimeout(item.timer); this.pending.delete(id); item.reject(new Error('Не удалось отправить команду карте')); }
  }
}
