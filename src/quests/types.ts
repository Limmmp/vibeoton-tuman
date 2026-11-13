import type { LatLon } from "../engine/geo";

export const QUEST_STEP_TYPES = ["goto", "hold", "tail", "collect", "explore", "listen", "quiz", "look", "visit"] as const;
export type QuestStepType = (typeof QUEST_STEP_TYPES)[number];

export type QuestPoint = LatLon & {
  id: string;
  name: string;
};

type StepBase = {
  id: string;
  text: string;
  say: string[];
};

export type GotoStep = StepBase & {
  type: "goto";
  poi: QuestPoint;
  radius: number;
  timeLimit?: number;
};

export type HoldStep = StepBase & {
  type: "hold";
  poi: QuestPoint;
  radius: number;
  seconds: number;
};

export type TailStep = StepBase & {
  type: "tail";
  from: QuestPoint;
  to: QuestPoint;
  speed: number;
  startRadius: number;
  warnDistance: number;
  loseDistance: number;
  minDistance: number;
  path?: LatLon[];
};

export type CollectStep = StepBase & {
  type: "collect";
  pois: QuestPoint[];
  radius: number;
};

export type ExploreStep = StepBase & {
  type: "explore";
  cells: number;
};

export type ListenStep = StepBase & {
  type: "listen";
  poi: QuestPoint;
  radius: number;
  audio: string;
};

export type QuizStep = StepBase & {
  type: "quiz";
  question: string;
  answers: [string, string, string];
  correct: 0 | 1 | 2;
};

export type LookStep = StepBase & {
  type: "look";
  poi: QuestPoint;
  radius: number;
  prompt: string;
};

export type VisitStep = StepBase & {
  type: "visit";
  place: QuestPoint;
  radius: number;
};

export type QuestStep = GotoStep | HoldStep | TailStep | CollectStep | ExploreStep | ListenStep | QuizStep | LookStep | VisitStep;

export type Quest = {
  id: string;
  storyId?: string;
  source: string;
  title: string;
  giver: string;
  intro: string;
  outro: string[];
  reward: { cash: number; rep: number };
  start: QuestPoint;
  steps: QuestStep[];
};

export type StepRuntime = {
  elapsed: number;
  holdSeconds?: number;
  collected?: string[];
  baseFogCells?: number;
  audioReady?: boolean;
  confirmationReady?: boolean;
  tailDistance?: number;
  tailStarted?: boolean;
  tooCloseSeconds?: number;
};

export type QuestSnapshot = {
  quest: Quest;
  stepIndex: number;
  runtime: StepRuntime;
};

export type ActiveStep = {
  questId: string;
  questTitle: string;
  stepIndex: number;
  stepCount: number;
  step: QuestStep;
  runtime: StepRuntime;
};

export type QuestRunnerEvent =
  | { type: "activeStep"; active: ActiveStep }
  | { type: "stepDone"; questId: string; stepId: string; stepIndex: number }
  | { type: "questDone"; questId: string; reward: Quest["reward"] }
  | { type: "questFailed"; questId: string; reason: string }
  | { type: "questStopped"; questId: string };
