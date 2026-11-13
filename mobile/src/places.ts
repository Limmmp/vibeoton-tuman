import type { Place } from '../../src/engine/protocol';

export const places: (Place & { description: string })[] = [
  { id: 'square', lat: 43.1155, lon: 131.8855, name: 'Центральная площадь', kind: 'quest', description: 'Первая точка знакомства с городом. Открой туман вокруг площади.' },
  { id: 'sea', lat: 43.1175, lon: 131.8771, name: 'Спортивная набережная', kind: 'leisure', description: 'Прогулка к морю. Выбери место и построй пеший маршрут.' },
  { id: 'eagle', lat: 43.1236, lon: 131.9022, name: 'Орлиное гнездо', kind: 'history', description: 'Поднимись над городом. Включи 3D, чтобы рассмотреть рельеф.' },
];
