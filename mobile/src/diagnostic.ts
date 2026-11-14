import type { Quest } from '../../src/engine/protocol';

export function diagnosticQuest(point: Quest['start'], source: string): Quest {
  return {
    id: 'mobile-controls-test', source, title: 'Тест кнопок интерфейса', giver: 'Исследователь',
    intro: 'Технический тест без исторических утверждений.', outro: ['Тест завершён.'], start: point,
    reward: { xp: 10, cash: 0, items: [] },
    steps: [
      { id: 'audio', type: 'listen', poi: point, radius: 30, audio: 'demo://quest-audio', text: 'Проверь кнопку завершения аудио.', say: [] },
      { id: 'quiz', type: 'quiz', text: 'Выбери ответ.', question: 'Какая кнопка завершает осмотр?', answers: ['Подтвердить осмотр', 'Где я', 'Убрать маршрут'], correct: 0, say: [] },
      { id: 'look', type: 'look', poi: point, radius: 30, prompt: 'Тестовое подтверждение у точки.', text: 'Подтверди осмотр.', say: [] },
    ],
  };
}
