import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, filter, map, of, switchMap, take } from 'rxjs';
import { ProjectPermission } from '../enums/project-permissions.enum';
import { AuthSessionService } from '../services/auth-session.service';
import { ProjectAccessService } from '../services/project-access.service';
import { isServerUnavailable } from '../utils/http-error.utils';

export const projectPermissionGuard = (permission: ProjectPermission): CanActivateFn => {
  return (route, state) => {
    const auth = inject(AuthSessionService);
    const router = inject(Router);
    const projectAccess = inject(ProjectAccessService);

    return auth.ready$.pipe(
      filter(Boolean),
      take(1),
      switchMap(() => {
        if (!auth.isAuthenticated()) {
          return of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }));
        }

        const projectId = route.paramMap.get('id');
        if (!projectId) return of(router.createUrlTree(['/errors/403']));

        return projectAccess.hasPermission(projectId, permission).pipe(
          map((hasPermission) => hasPermission ? true : router.createUrlTree(['/errors/403'])),
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && isServerUnavailable(error)) {
              return of(router.createUrlTree(['/server-unavailable']));
            }

            return of(router.createUrlTree(['/errors/403']));
          }),
        );
      }),
    );
  };
};
