import type { LatLon } from "./geo.ts";

export const DEMO_SPEEDS = [1, 8, 32] as const;
export const DEFAULT_SIM_SPEED = 8;

export function simSpeed(value: number): number {
  if (!Number.isFinite(value) || value < 1 || value > 64) throw new Error("Скорость симуляции должна быть от 1 до 64");
  return value;
}

export function demoPoint(value: LatLon): LatLon {
  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat) > 85 || Math.abs(value.lon) > 180) {
    throw new Error("Укажи широту от −85 до 85 и долготу от −180 до 180");
  }
  return { lat: value.lat, lon: value.lon };
}

export function movementStep(seconds: number, multiplier: number, running = false): number {
  return 1.5 * Math.max(0, seconds) * simSpeed(multiplier) * (running ? 4 : 1);
}
