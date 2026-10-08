import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, of, switchMap, take } from 'rxjs';
import { RoleModel } from '../models/users/user.models';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';

export const roleGuard = (roles: string | string[]): CanActivateFn => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  return userRolesGuard((userRoles) => userRoles.some((role) => allowedRoles.includes(role.code)));
};

export const exceptRoleGuard = (roles: string | string[]): CanActivateFn => {
  const deniedRoles = Array.isArray(roles) ? roles : [roles];
  return userRolesGuard((userRoles) => !userRoles.some((role) => deniedRoles.includes(role.code)));
};

function userRolesGuard(allows: (roles: RoleModel[]) => boolean): CanActivateFn {
  return (_, state) => {
    const auth = inject(AuthSessionService);
    const store = inject(Store);
    const router = inject(Router);

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
          map(() =>
            allows(store.selectSignal(UserStoreSelectors.getRoles)())
              ? true
              : router.createUrlTree(['/errors/403']),
          ),
        );
      }),
    );
  };
}
