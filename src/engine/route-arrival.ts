import { distance, type LatLon } from './geo.ts';

/** Отменяет устаревшие ответы маршрутизатора и завершает путь при прибытии. */
export class RouteArrival {
  private generation = 0;
  private destination: LatLon | null = null;
  begin() { this.destination = null; return ++this.generation; }
  install(token: number, destination: LatLon) {
    if (token !== this.generation) return false;
    this.destination = { ...destination };
    return true;
  }
  cancel() { this.generation++; this.destination = null; }
  reached(position: LatLon): boolean {
    if (!this.destination || distance(position, this.destination) > 35) return false;
    this.cancel();
    return true;
  }
}
