import { ticketStatusTone } from './ticket-status-badge.component';

describe('ticketStatusTone', () => {
  it.each([
    ['New', 'neutral'],
    ['InProgress', 'active'],
    ['InReview', 'review'],
    ['Testing', 'testing'],
    ['Closed', 'success'],
    ['Rejected', 'danger'],
  ] as const)('maps %s to %s', (code, expected) => {
    expect(ticketStatusTone(code)).toBe(expected);
  });

  it('uses a neutral tone for future statuses', () => {
    expect(ticketStatusTone('AwaitingApproval')).toBe('neutral');
  });
});
