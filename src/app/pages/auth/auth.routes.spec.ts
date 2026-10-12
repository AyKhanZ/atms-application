import { guestGuard } from '../../core/guards/guest.guard';
import { AUTH_ROUTES } from './auth.routes';

describe('AUTH_ROUTES', () => {
  const guardsOf = (path: string) => AUTH_ROUTES.find((route) => route.path === path)?.canActivate;

  it('sends a signed-in user away only from login and forgot-password', () => {
    expect(guardsOf('login')).toEqual([guestGuard]);
    expect(guardsOf('forgot-password')).toEqual([guestGuard]);
  });

  // links from emails open even when another account is signed in in this browser
  it('opens email confirmation and password reset for a signed-in user', () => {
    expect(guardsOf('email-confirmation')).toBeUndefined();
    expect(guardsOf('reset-password')).toBeUndefined();
  });
});
