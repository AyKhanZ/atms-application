import { Routes } from '@angular/router';
import { Roles } from '../../core/enums/roles.enum';
import { roleGuard } from '../../core/guards/role.guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/list.component').then((c) => c.ProjectListComponent),
  },
  {
    path: 'create',
    canActivate: [roleGuard(Roles.SuperAdmin)],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./create/create.component').then((c) => c.ProjectCreateComponent),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard(Roles.SuperAdmin)],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./edit/edit.component').then((c) => c.ProjectEditComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./details/details.component').then((c) => c.ProjectDetailsComponent),
  },
];
