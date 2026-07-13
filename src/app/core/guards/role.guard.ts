import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';

export const roleGuard = (roles: string | string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthSessionService);
    const store = inject(Store);
    const router = inject(Router);
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userRoles = store.selectSignal(UserStoreSelectors.getRoles)();

    if (!auth.isAuthenticated() || userRoles.length === 0) return true;

    return userRoles.some((role) => allowedRoles.includes(role.code))
      ? true
      : router.createUrlTree(['/errors/403']);
  };
};