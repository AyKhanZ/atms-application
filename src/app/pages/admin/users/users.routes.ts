import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/guards/permission.guard';
import { Permissions } from '../../../core/enums/permissions.enum';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/users-list.component')
      .then((c) => c.UsersListComponent),
    canActivate: [permissionGuard(Permissions.User.View)],
  },
  {
    path: ':id',
    loadComponent: () => import('./details/user-details.component')
      .then((c) => c.UserDetailsComponent),
    canActivate: [permissionGuard(Permissions.User.View)],
  },
];
