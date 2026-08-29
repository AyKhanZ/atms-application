import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, of, switchMap, take } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';

export const roleGuard = (roles: string | string[]): CanActivateFn => {
  return (_, state) => {
    const auth = inject(AuthSessionService);
    const store = inject(Store);
    const router = inject(Router);
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return auth.ready$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() => {
        if (!auth.isAuthenticated()) {
          return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
        }

        return store.select(UserStoreSelectors.getMe).pipe(
          filter((me) => me !== null),
          take(1),
          map(() => {
            const userRoles = store.selectSignal(UserStoreSelectors.getRoles)();

            return userRoles.some((role) => allowedRoles.includes(role.code))
              ? true
              : router.createUrlTree(['/errors/403']);
          }),
        );
      }),
    );
  };
};
