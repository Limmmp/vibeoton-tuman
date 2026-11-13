import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetLabel, planBudget } from "../src/budget.ts";

const team = [{ userId: "petya", budget: 300 }, { userId: "masha", budget: 2000 }, { userId: "anya", budget: 500 }];

test("каждый за себя — лимит по самому скромному бюджету", () => {
  const p = planBudget("individual", team);
  assert.equal(p.perPerson, 300);
  assert.equal(p.total, 2800);
  assert.equal(p.effective.get("masha"), 2000);
  assert.deepEqual(p.shortfall, []);
});

test("скидываемся — на человека приходится среднее, богатые покрывают остальных", () => {
  const p = planBudget("pooled", team);
  assert.equal(p.perPerson, 933);
  assert.equal(p.effective.get("petya"), 933);
  assert.match(budgetLabel(p), /2800 ₽ на всех/);
});

test("фиксированная сумма — видно, кому не хватает", () => {
  const p = planBudget("fixed", team, 600);
  assert.equal(p.perPerson, 600);
  assert.equal(p.total, 1800);
  assert.deepEqual(p.shortfall.map((s) => [s.userId, s.missing]), [["petya", 300], ["anya", 100]]);
  assert.match(budgetLabel(p), /не хватает у 2/);
});

test("пустая компания и отрицательные суммы не ломают расчёт", () => {
  assert.equal(planBudget("pooled", []).perPerson, 0);
  assert.equal(planBudget("individual", [{ userId: "x", budget: -50 }]).perPerson, 0);
});
