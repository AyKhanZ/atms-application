import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';

export const guestGuard: CanActivateChildFn = () => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  return auth.ready$.pipe(
    filter(Boolean),
    take(1),
    map(() => (auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true)),
  );
};
