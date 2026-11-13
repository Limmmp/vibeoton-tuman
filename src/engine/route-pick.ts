// Выбор короткого и пологого маршрута из кандидатов. Чистая функция — покрыта тестами.
//
// «Пологий» — не про суммарный подъём: во Владивостоке он почти неизбежен, потому что
// начало и конец на разной высоте. Ногам тяжело от крутых участков, и их можно обойти.

type Candidate = { distance: number; steep: number; maxGrade: number };

export const GENTLE_MAX_DETOUR = 1.6; // не длиннее короткого больше чем в 1,6 раза
export const GENTLE_MIN_SAVING = 50; // м крутизны — меньше разница не ощущается
export const GENTLE_MIN_GRADE_DROP = 5; // п. п. — либо самый крутой участок заметно положе

export function pickRoutes<T extends Candidate>(candidates: T[]): { short: T; gentle: T | null } {
  if (!candidates.length) throw new Error("Маршрут не найден");
  const short = candidates.reduce((best, c) => (c.distance < best.distance ? c : best));
  const saving = Math.max(GENTLE_MIN_SAVING, short.steep * 0.3);
  const better = (c: T) =>
    c.steep <= short.steep - saving ||
    (c.steep <= short.steep && c.maxGrade <= short.maxGrade - GENTLE_MIN_GRADE_DROP);
  let gentle: T | null = null;
  for (const c of candidates) {
    if (c === short || c.distance > short.distance * GENTLE_MAX_DETOUR || !better(c)) continue;
    if (!gentle || c.steep < gentle.steep || (c.steep === gentle.steep && c.maxGrade < gentle.maxGrade)) gentle = c;
  }
  return { short, gentle };
}
