// Режимы бюджета встречи. Решает, сколько «может потратить каждый» для подбора мест.
//
//  individual — каждый платит за себя: место должно подойти самому скромному бюджету.
//  pooled     — скидываемся в общий котёл: кто может больше, покрывает остальных;
//               на человека приходится среднее по компании.
//  fixed      — организатор назначает сумму, она нужна каждому; у кого меньше — видно сразу.

export const BUDGET_MODES = ["individual", "pooled", "fixed"] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];

export type BudgetMember = { userId: string; budget: number };

export type BudgetPlan = {
  mode: BudgetMode;
  perPerson: number; // лимит цены места на человека, ₽
  total: number; // сколько компания готова потратить вместе, ₽
  shortfall: { userId: string; missing: number }[]; // кому не хватает до суммы встречи
  effective: Map<string, number>; // бюджет каждого для подбора мест
};

export function planBudget(mode: BudgetMode, members: BudgetMember[], fixed?: number | null): BudgetPlan {
  const budgets = members.map((m) => Math.max(0, Math.floor(m.budget)));
  const total = budgets.reduce((a, b) => a + b, 0);
  let perPerson: number;
  if (!members.length) perPerson = 0;
  else if (mode === "pooled") perPerson = Math.floor(total / members.length);
  else if (mode === "fixed") perPerson = Math.max(0, Math.floor(fixed ?? 0));
  else perPerson = Math.min(...budgets);
  const shortfall = mode === "fixed"
    ? members.flatMap((m, i) => (budgets[i] < perPerson ? [{ userId: m.userId, missing: perPerson - budgets[i] }] : []))
    : [];
  const effective = new Map(members.map((m, i) => [m.userId, mode === "individual" ? budgets[i] : perPerson]));
  return { mode, perPerson, total: mode === "fixed" ? perPerson * members.length : total, shortfall, effective };
}

export function budgetLabel(plan: BudgetPlan): string {
  if (plan.mode === "pooled") return `Скидываемся: ${plan.total} ₽ на всех, до ${plan.perPerson} ₽ на человека`;
  if (plan.mode === "fixed") return `У каждого ${plan.perPerson} ₽${plan.shortfall.length ? ` · не хватает у ${plan.shortfall.length}` : ""}`;
  return `Каждый за себя: до ${plan.perPerson} ₽ на человека`;
}
