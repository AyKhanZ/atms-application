import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';

export const permissionGuard = (permission: string): CanActivateFn => {
  return () => {
    const store = inject(Store);
    const router = inject(Router);

    const permissions = store.selectSignal(UserStoreSelectors.getPermissions)();

    if (!permissions.includes(permission)) {
      return router.createUrlTree(['/errors/403']);
    }

    return true;
  };
};
