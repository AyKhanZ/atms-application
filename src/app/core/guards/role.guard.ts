import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';

export const roleGuard = (roles: string | string[]): CanActivateFn => {
  return () => {
    const store = inject(Store);
    const router = inject(Router);

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userRoles = store.selectSignal(UserStoreSelectors.getRoles)();

    if (userRoles.length === 0) {
      return true;
    }

    const hasRole = allowedRoles.some((role) => {
      const normalized = normalize(role);

      return userRoles.some((item) =>
        normalize(item.code) === normalized || normalize(item.name) === normalized);
    });

    if (!hasRole) {
      return router.createUrlTree(['/errors/403']);
    }

    return true;
  };
};

function normalize(value: string | undefined): string {
  return value?.replace(/\s+/g, '').toLowerCase() ?? '';
}
