import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Roles } from './core/enums/roles.enum';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'server-unavailable',
    loadComponent: () =>
      import('./pages/errors/server-error/server-error.component').then(
        (c) => c.ServerErrorComponent,
      ),
  },
  // Auth layout
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/auth/auth-layout').then((c) => c.AuthLayoutComponent),
    canActivateChild: [guestGuard],
    loadChildren: () => import('./pages/auth/auth.routes').then((c) => c.AUTH_ROUTES),
  },
  // Main layout
  {
    path: '',
    loadComponent: () =>
      import('./shared/layouts/main-layout/main-layout').then((c) => c.MainLayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        data: { breadcrumb: { title: 'Dashboard', icon: 'pi-th-large' } },
        loadComponent: () => import('./pages/dashboard/dashboard').then((c) => c.Dashboard),
      },
      {
        path: 'users',
        data: { breadcrumb: { title: 'Users', icon: 'pi-users' } },
        loadChildren: () => import('./pages/admin/users/users.routes').then((r) => r.USERS_ROUTES),
        canActivate: [roleGuard(Roles.SuperAdmin)],
      },
    ],
  },
  {
    path: 'errors',
    children: [
      {
        path: '500',
        loadComponent: () =>
          import('./pages/errors/server-error/server-error.component').then(
            (c) => c.ServerErrorComponent,
          ),
      },
      {
        path: '403',
        loadComponent: () =>
          import('./pages/errors/forbidden/forbidden.component').then((c) => c.ForbiddenComponent),
      },
      {
        path: '404',
        loadComponent: () =>
          import('./pages/errors/not-found/not-found.component').then((c) => c.NotFoundComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'errors/404',
  },
];
