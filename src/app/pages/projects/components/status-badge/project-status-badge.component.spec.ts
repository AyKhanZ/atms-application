import { describe, expect, it } from 'vitest';
import { projectStatusTone } from './project-status-badge.component';

describe('projectStatusTone', () => {
  it.each([
    ['Draft', 'draft'],
    ['Active', 'active'],
    ['OnReview', 'review'],
    ['Closed', 'closed'],
  ] as const)('maps %s to the %s tone', (code, expected) => {
    expect(projectStatusTone(code)).toBe(expected);
  });

  it('uses a neutral tone for an unknown status', () => {
    expect(projectStatusTone('FutureStatus')).toBe('unknown');
  });
});
