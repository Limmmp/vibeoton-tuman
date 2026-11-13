// Исторические факты для режима «История» и квестов: текст + источник.
// Файл данных — data/facts.json (массив Fact). Проверка — npm run data:check.
// Правило: факт без ссылки на источник в приложение не попадает; verified ставит только человек,
// который сам открыл источник и сверил текст. Легенды помечаются legend: true и показываются как легенды.

export type Fact = {
  id: string; // латиница через дефис, например "s56-museum-opened"
  text: string; // 1–3 предложения, как увидит игрок
  placeId?: string; // id места из places.json или точки квеста (lm:*)
  questId?: string; // если факт озвучивается в квесте
  source: string; // ссылка на источник (музей, книга в электронном виде, архив, энциклопедия)
  sourceTitle: string; // как источник назвать в интерфейсе: «Музей им. Арсеньева», «Энциклопедия …»
  legend: boolean; // true — городская легенда, не факт; интерфейс так и пишет
  verified: boolean; // true — человек открыл источник и сверил текст
  checkedAt: string | null; // YYYY-MM-DD
  checkedBy?: string; // кто проверил
  notes?: string;
};

export function validateFact(f: Fact): string[] {
  const errs: string[] = [];
  if (!/^[a-z0-9][a-z0-9-]*$/.test(f.id ?? "")) errs.push("id: латиница в нижнем регистре, цифры и дефис");
  if (!f.text?.trim()) errs.push("text пустой");
  else if (f.text.length > 400) errs.push("text длиннее 400 символов — разбей на несколько фактов");
  if (!/^https?:\/\//.test(f.source ?? "")) errs.push("source: нужна ссылка на источник");
  if (!f.sourceTitle?.trim()) errs.push("sourceTitle пустой");
  if (typeof f.legend !== "boolean") errs.push("legend: true или false");
  if (f.verified && !f.checkedAt) errs.push("verified без checkedAt");
  if (f.checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(f.checkedAt)) errs.push("checkedAt: формат YYYY-MM-DD");
  return errs;
}
