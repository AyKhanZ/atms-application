import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';

export const permissionGuard = (permission: string): CanActivateFn => {
  return () => {
    const store = inject(Store);
    const router = inject(Router);

    const permissions = store.selectSignal(UserStoreSelectors.getPermissions)();

    if (permissions.length === 0) {
      return true;
    }

    if (!permissions.some((item) => normalize(item) === normalize(permission))) {
      return router.createUrlTree(['/errors/403']);
    }

    return true;
  };
};

function normalize(value: string | undefined): string {
  return value?.replace(/\s+/g, '').toLowerCase() ?? '';
}
