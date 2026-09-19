import { Routes } from '@angular/router';
import { ProjectPermissions } from '../../core/enums/project-permissions.enum';
import { Permissions } from '../../core/enums/permissions.enum';
import { Roles } from '../../core/enums/roles.enum';
import { permissionGuard } from '../../core/guards/permission.guard';
import { projectPermissionGuard } from '../../core/guards/project-permission.guard';
import { roleGuard } from '../../core/guards/role.guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';
import { recreateOnParamChange } from '../../core/routing/app-route-reuse.strategy';
import { transientInHistory } from '../../core/services/navigation-history.service';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [permissionGuard(Permissions.Project.View)],
    loadComponent: () => import('./list/list.component').then((c) => c.ProjectListComponent),
  },
  {
    path: 'create',
    data: { breadcrumb: { title: 'New project' }, [transientInHistory]: true },
    canActivate: [roleGuard(Roles.SuperAdmin)],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./create/create.component').then((c) => c.ProjectCreateComponent),
  },
  {
    // No breadcrumb entry: the trail already ends at the project being edited, and the page's
    // own "Edit project" heading states the mode. A crumb here would only repeat it.
    path: ':projectId/edit',
    data: { [transientInHistory]: true },
    canActivate: [
      permissionGuard(Permissions.Project.Edit),
      projectPermissionGuard(ProjectPermissions.Project.Edit),
    ],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./edit/edit.component').then((c) => c.ProjectEditComponent),
  },
  {
    path: ':projectId/tickets/create',
    data: { breadcrumb: { title: 'New ticket' }, [transientInHistory]: true },
    canActivate: [
      permissionGuard(Permissions.Project.View),
      projectPermissionGuard(ProjectPermissions.Ticket.Create),
    ],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./tickets/create/ticket-create.component').then(
        (component) => component.TicketCreateComponent,
      ),
  },
  {
    // No breadcrumb entry — see the project edit route above.
    path: ':projectId/tickets/:ticketId/edit',
    data: { [transientInHistory]: true },
    canActivate: [
      permissionGuard(Permissions.Project.Edit),
      projectPermissionGuard(ProjectPermissions.Ticket.Edit),
    ],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./tickets/edit/ticket-edit.component').then(
        (component) => component.TicketEditComponent,
      ),
  },
  {
    path: ':projectId/tickets/:ticketId/tasks/create',
    data: { breadcrumb: { title: 'New task' }, [transientInHistory]: true },
    canActivate: [
      permissionGuard(Permissions.Project.View),
      projectPermissionGuard(ProjectPermissions.Task.Create),
    ],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./tasks/create/task-create.component').then(
        (component) => component.TaskCreateComponent,
      ),
  },
  {
    path: ':projectId/tickets/:ticketId/tasks/:taskId/edit',
    data: { [transientInHistory]: true },
    canActivate: [
      permissionGuard(Permissions.Project.Edit),
      projectPermissionGuard(ProjectPermissions.Task.Edit),
    ],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./tasks/edit/task-edit.component').then((component) => component.TaskEditComponent),
  },
  {
    path: ':projectId/tickets/:ticketId/tasks/:taskId',
    canActivate: [
      permissionGuard(Permissions.Project.View),
      projectPermissionGuard(ProjectPermissions.Project.View),
    ],
    loadComponent: () =>
      import('./tasks/details/task-details.component').then(
        (component) => component.TaskDetailsComponent,
      ),
  },
  {
    path: ':projectId/tickets/:ticketId',
    // Follows its ticket id itself; a ticket of another project gets a fresh page.
    data: { [recreateOnParamChange]: ['projectId'] },
    canActivate: [
      permissionGuard(Permissions.Project.View),
      projectPermissionGuard(ProjectPermissions.Project.View),
    ],
    loadComponent: () =>
      import('./tickets/details/ticket-details.component').then(
        (component) => component.TicketDetailsComponent,
      ),
  },
  {
    path: ':projectId',
    // The page is built around one project id; another project gets a fresh page.
    data: { [recreateOnParamChange]: true },
    canActivate: [
      permissionGuard(Permissions.Project.View),
      projectPermissionGuard(ProjectPermissions.Project.View),
    ],
    loadComponent: () =>
      import('./details/details.component').then((c) => c.ProjectDetailsComponent),
  },
];
