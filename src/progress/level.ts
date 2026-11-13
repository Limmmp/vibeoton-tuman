/** Общие пороги для движка, HUD и профиля. Сохранённый level может устареть. */
export function levelProgress(value: number) {
  const xp = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const floor = 100 * (level - 1) ** 2, next = 100 * level ** 2;
  return { level, xp, floor, next, earned: xp - floor, required: next - floor, fraction: (xp - floor) / (next - floor) };
}
