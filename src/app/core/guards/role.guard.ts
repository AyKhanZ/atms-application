import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';

export const roleGuard = (role: string): CanActivateFn => {
  return () => {
    const store = inject(Store);
    const router = inject(Router);

    const roles = store.selectSignal(UserStoreSelectors.getRoles)();
    const hasRole = roles.some((r) => r.code === role);

    if (!hasRole) {
      return router.createUrlTree(['/errors/403']);
    }

    return true;
  };
};
