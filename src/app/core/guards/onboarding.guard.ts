import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';

export const onboardingCompletedGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  return auth.ready$.pipe(
    filter(Boolean),
    take(1),
    map(() =>
      auth.isOnboardingCompleted() ? true : router.createUrlTree(['/onboarding']),
    ),
  );
};

export const onboardingPageGuard: CanActivateFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  return auth.ready$.pipe(
    filter(Boolean),
    take(1),
    map(() =>
      auth.isOnboardingCompleted() ? router.createUrlTree(['/dashboard']) : true,
    ),
  );
};
