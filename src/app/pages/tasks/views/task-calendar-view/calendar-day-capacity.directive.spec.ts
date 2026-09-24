import { calendarVisibleCount } from './calendar-day-capacity.directive';

describe('calendarVisibleCount', () => {
  it.each([
    [5, 260, 5],
    [6, 260, 4],
    [5, 400, 5],
    [12, 400, 7],
    [0, 200, 0],
    [2, 40, 1],
    [5, 256, 5],
    [6, 255, 4],
  ])('fits %s tasks in %s px as %s visible cards', (total, height, expected) => {
    expect(calendarVisibleCount(total, height, 48, 4, 28)).toBe(expected);
  });
});
