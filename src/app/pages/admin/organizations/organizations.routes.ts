import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/guards/permission.guard';
import { Permissions } from '../../../core/enums/permissions.enum';
import { transientInHistory } from '../../../core/services/navigation-history.service';

export const ORGANIZATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/list.component').then((c) => c.ListComponent),
    canActivate: [permissionGuard(Permissions.Organization.View)],
  },
  {
    path: 'create',
    data: { [transientInHistory]: true },
    loadComponent: () => import('./create/create.component').then((c) => c.CreateComponent),
    canActivate: [permissionGuard(Permissions.Organization.Edit)],
  },
  {
    path: ':id',
    loadComponent: () => import('./details/details.component').then((c) => c.DetailsComponent),
    canActivate: [permissionGuard(Permissions.Organization.View)],
  },
  {
    path: ':id/edit',
    data: { [transientInHistory]: true },
    loadComponent: () => import('./edit/edit.component').then((c) => c.EditComponent),
    canActivate: [permissionGuard(Permissions.Organization.Edit)],
  },
];
