import { hasCompletedOnboarding, tokenSubject } from './jwt-claims.utils';

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

describe('tokenSubject', () => {
  it('reads the user id from the sub claim', () => {
    expect(tokenSubject(tokenWith({ sub: 'user-a' }))).toBe('user-a');
  });

  it('is null without a token or a subject', () => {
    expect(tokenSubject(null)).toBeNull();
    expect(tokenSubject(tokenWith({}))).toBeNull();
    expect(tokenSubject('not-a-token')).toBeNull();
  });
});
