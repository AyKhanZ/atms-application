import { workGroupStatusTone } from './work-group-status-badge.component';

describe('workGroupStatusTone', () => {
  it.each([
    ['Planned', 'planned'],
    ['active', 'active'],
    ['DONE', 'done'],
    ['unknown', 'unknown'],
  ] as const)('maps %s to %s', (code, tone) => {
    expect(workGroupStatusTone(code)).toBe(tone);
  });
});
