import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Roles } from '../enums/roles.enum';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';

export const permissionGuard = (permission: string): CanActivateFn => {
  return () => {
    const auth = inject(AuthSessionService);
    const store = inject(Store);
    const router = inject(Router);
    const permissions = store.selectSignal(UserStoreSelectors.getPermissions)();
    const roles = store.selectSignal(UserStoreSelectors.getRoles)();

    if (!auth.isAuthenticated() || permissions.length === 0 || roles.some((role) => role.code === Roles.SuperAdmin)) {
      return true;
    }

    return permissions.includes(permission) ? true : router.createUrlTree(['/errors/403']);
  };
};