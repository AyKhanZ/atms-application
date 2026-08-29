import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, of, switchMap, take } from 'rxjs';
import { Roles } from '../enums/roles.enum';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';

export const permissionGuard = (permission: string): CanActivateFn => {
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
          map(() => {
            const permissions = store.selectSignal(UserStoreSelectors.getPermissions)();
            const roles = store.selectSignal(UserStoreSelectors.getRoles)();
            const isSuperAdmin = roles.some((role) => role.code === Roles.SuperAdmin);

            return isSuperAdmin || permissions.includes(permission)
              ? true
              : router.createUrlTree(['/errors/403']);
          }),
        );
      }),
    );
  };
};
