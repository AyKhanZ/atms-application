import { hasCompletedOnboarding } from './jwt-claims.utils';

function tokenWith(payload: object): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${encoded}.signature`;
}

describe('hasCompletedOnboarding', () => {
  it('accepts boolean and string true claims', () => {
    expect(hasCompletedOnboarding(tokenWith({ onboarding_completed: true }))).toBe(true);
    expect(hasCompletedOnboarding(tokenWith({ onboarding_completed: 'true' }))).toBe(true);
  });

  it('rejects missing, false, and malformed claims', () => {
    expect(hasCompletedOnboarding(tokenWith({ onboarding_completed: false }))).toBe(false);
    expect(hasCompletedOnboarding(tokenWith({}))).toBe(false);
    expect(hasCompletedOnboarding('not-a-token')).toBe(false);
    expect(hasCompletedOnboarding(null)).toBe(false);
  });
});
