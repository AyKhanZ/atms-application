import { Routes } from '@angular/router';
import { ProjectPermissions } from '../../core/enums/project-permissions.enum';
import { Permissions } from '../../core/enums/permissions.enum';
import { Roles } from '../../core/enums/roles.enum';
import { permissionGuard } from '../../core/guards/permission.guard';
import { projectPermissionGuard } from '../../core/guards/project-permission.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(Permissions.Project.View)],
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
    canActivate: [projectPermissionGuard(ProjectPermissions.Project.Edit)],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./edit/edit.component').then((c) => c.ProjectEditComponent),
  },
  {
    path: ':id',
    canActivate: [projectPermissionGuard(ProjectPermissions.Project.View)],
    loadComponent: () =>
      import('./details/details.component').then((c) => c.ProjectDetailsComponent),
  },
];
