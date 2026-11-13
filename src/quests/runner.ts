import { distance, lerp, type LatLon } from "../engine/geo.ts";
import type { ActiveStep, Quest, QuestRunnerEvent, QuestSnapshot, QuestStep, StepRuntime, TailStep } from "./types.ts";

type RunnerOptions = {
  emit?: (event: QuestRunnerEvent) => void;
  save?: (snapshot: QuestSnapshot | null) => void;
};

export class QuestRunner {
  private snapshot: QuestSnapshot | null = null;
  private position: LatLon | null = null;
  private fogCells = 0;
  private syncClock = 0;
  private emit: (event: QuestRunnerEvent) => void;
  private save: (snapshot: QuestSnapshot | null) => void;

  constructor(options: RunnerOptions = {}) {
    this.emit = options.emit ?? (() => {});
    this.save = options.save ?? (() => {});
  }

  get active(): ActiveStep | null {
    const state = this.snapshot;
    if (!state) return null;
    return {
      questId: state.quest.id,
      questTitle: state.quest.title,
      stepIndex: state.stepIndex,
      stepCount: state.quest.steps.length,
      step: state.quest.steps[state.stepIndex],
      runtime: cloneRuntime(state.runtime),
    };
  }

  start(quest: Quest, context: { position?: LatLon; fogCells?: number } = {}) {
    this.position = context.position ?? this.position;
    this.fogCells = context.fogCells ?? this.fogCells;
    this.syncClock = 0;
    this.snapshot = { quest, stepIndex: 0, runtime: this.initialRuntime(quest.steps[0]) };
    this.persistAndEmit();
    this.evaluatePosition();
    return this.active;
  }

  restore(snapshot: QuestSnapshot, context: { position?: LatLon; fogCells?: number } = {}) {
    if (!snapshot.quest.steps[snapshot.stepIndex]) throw new Error("Сохранённый шаг квеста не существует");
    this.position = context.position ?? this.position;
    this.fogCells = context.fogCells ?? this.fogCells;
    this.syncClock = 0;
    this.snapshot = structuredClone(snapshot);
    this.persistAndEmit();
    return this.active;
  }

  stop() {
    if (!this.snapshot) return;
    const questId = this.snapshot.quest.id;
    this.snapshot = null;
    this.save(null);
    this.emit({ type: "questStopped", questId });
  }

  updatePosition(position: LatLon) {
    this.position = position;
    this.evaluatePosition();
  }

  updateFog(cells: number) {
    this.fogCells = cells;
    const state = this.snapshot;
    if (!state) return;
    const step = state.quest.steps[state.stepIndex];
    if (step.type === "explore" && cells - (state.runtime.baseFogCells ?? cells) >= step.cells) this.completeStep();
  }

  tick(seconds: number) {
    const state = this.snapshot;
    if (!state || !this.position || !(seconds > 0)) return;
    const step = state.quest.steps[state.stepIndex];
    state.runtime.elapsed += seconds;

    if (step.type === "goto" && step.timeLimit && state.runtime.elapsed > step.timeLimit) {
      this.fail("Не успел");
      return;
    }
    if (step.type === "hold") {
      if (distance(this.position, step.poi) <= step.radius) {
        state.runtime.holdSeconds = (state.runtime.holdSeconds ?? 0) + seconds;
        if (state.runtime.holdSeconds >= step.seconds) return this.completeStep();
      } else {
        state.runtime.holdSeconds = 0;
      }
    }
    if (step.type === "tail") this.tickTail(step, seconds);

    if (!this.snapshot) return;
    this.syncClock += seconds;
    if (this.syncClock >= 1) {
      this.syncClock %= 1;
      this.persistAndEmit();
    }
  }

  answerQuiz(answer: number): { correct: boolean } {
    const step = this.requireStep("quiz");
    if (![0, 1, 2].includes(answer)) throw new Error("Ответ quiz должен быть 0, 1 или 2");
    const correct = answer === step.correct;
    if (correct) this.completeStep();
    return { correct };
  }

  completeListen() {
    this.requireStep("listen");
    if (!this.snapshot!.runtime.audioReady) throw new Error("Сначала подойдите к точке аудио");
    this.completeStep();
  }

  confirmLook() {
    this.requireStep("look");
    if (!this.snapshot!.runtime.confirmationReady) throw new Error("Сначала подойдите к объекту");
    this.completeStep();
  }

  snapshotForSave(): QuestSnapshot | null {
    return this.snapshot ? structuredClone(this.snapshot) : null;
  }

  private evaluatePosition() {
    const state = this.snapshot;
    if (!state || !this.position) return;
    const step = state.quest.steps[state.stepIndex];

    if (step.type === "goto" && distance(this.position, step.poi) <= step.radius) return this.completeStep();
    if (step.type === "visit" && distance(this.position, step.place) <= step.radius) return this.completeStep();
    if (step.type === "collect") {
      const collected = new Set(state.runtime.collected ?? []);
      for (const poi of step.pois) if (distance(this.position, poi) <= step.radius) collected.add(poi.id);
      if (collected.size !== state.runtime.collected?.length) {
        state.runtime.collected = [...collected];
        this.persistAndEmit();
      }
      if (collected.size === step.pois.length) return this.completeStep();
    }
    if (step.type === "listen") this.setReady("audioReady", distance(this.position, step.poi) <= step.radius);
    if (step.type === "look") this.setReady("confirmationReady", distance(this.position, step.poi) <= step.radius);
  }

  private tickTail(step: TailStep, seconds: number) {
    const state = this.snapshot!;
    const path = step.path?.length ? step.path : [step.from, step.to];
    const current = pointAlong(path, state.runtime.tailDistance ?? 0);
    const playerDistance = distance(this.position!, current);

    if (!state.runtime.tailStarted) {
      if (playerDistance <= step.startRadius) state.runtime.tailStarted = true;
      else return;
    }

    const traveled = (state.runtime.tailDistance ?? 0) + step.speed * seconds;
    state.runtime.tailDistance = traveled;
    const target = pointAlong(path, traveled);
    const d = distance(this.position!, target);
    if (d > step.loseDistance) return this.fail("Цель потеряна");
    state.runtime.tooCloseSeconds = d < step.minDistance ? (state.runtime.tooCloseSeconds ?? 0) + seconds : Math.max(0, (state.runtime.tooCloseSeconds ?? 0) - seconds / 2);
    if ((state.runtime.tooCloseSeconds ?? 0) > 3) return this.fail("Тебя заметили");
    if (traveled >= pathLength(path)) this.completeStep();
  }

  private setReady(key: "audioReady" | "confirmationReady", value: boolean) {
    const state = this.snapshot!;
    if (state.runtime[key] === value) return;
    state.runtime[key] = value;
    this.persistAndEmit();
  }

  private requireStep<T extends QuestStep["type"]>(type: T): Extract<QuestStep, { type: T }> {
    const step = this.snapshot?.quest.steps[this.snapshot.stepIndex];
    if (!step || step.type !== type) throw new Error(`Активный шаг не ${type}`);
    return step as Extract<QuestStep, { type: T }>;
  }

  private completeStep() {
    const state = this.snapshot;
    if (!state) return;
    const stepIndex = state.stepIndex;
    const step = state.quest.steps[stepIndex];
    this.emit({ type: "stepDone", questId: state.quest.id, stepId: step.id, stepIndex });
    state.stepIndex++;
    if (state.stepIndex >= state.quest.steps.length) {
      const { id: questId, reward } = state.quest;
      this.snapshot = null;
      this.save(null);
      this.emit({ type: "questDone", questId, reward });
      return;
    }
    state.runtime = this.initialRuntime(state.quest.steps[state.stepIndex]);
    this.persistAndEmit();
    this.evaluatePosition();
  }

  private fail(reason: string) {
    if (!this.snapshot) return;
    const questId = this.snapshot.quest.id;
    this.snapshot = null;
    this.save(null);
    this.emit({ type: "questFailed", questId, reason });
  }

  private initialRuntime(step: QuestStep): StepRuntime {
    return {
      elapsed: 0,
      ...(step.type === "hold" ? { holdSeconds: 0 } : {}),
      ...(step.type === "collect" ? { collected: [] } : {}),
      ...(step.type === "explore" ? { baseFogCells: this.fogCells } : {}),
      ...(step.type === "listen" ? { audioReady: false } : {}),
      ...(step.type === "look" ? { confirmationReady: false } : {}),
      ...(step.type === "tail" ? { tailDistance: 0, tailStarted: false, tooCloseSeconds: 0 } : {}),
    };
  }

  private persistAndEmit() {
    if (!this.snapshot) return;
    this.save(this.snapshotForSave());
    this.emit({ type: "activeStep", active: this.active! });
  }
}

function cloneRuntime(runtime: StepRuntime): StepRuntime {
  return { ...runtime, ...(runtime.collected ? { collected: [...runtime.collected] } : {}) };
}

function pathLength(path: LatLon[]) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distance(path[i - 1], path[i]);
  return total;
}

function pointAlong(path: LatLon[], meters: number): LatLon {
  let left = meters;
  for (let i = 1; i < path.length; i++) {
    const length = distance(path[i - 1], path[i]);
    if (left <= length) return lerp(path[i - 1], path[i], length ? left / length : 1);
    left -= length;
  }
  return path[path.length - 1];
}
