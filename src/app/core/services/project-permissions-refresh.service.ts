import { inject, Injectable } from '@angular/core';
import { concat, Observable, of, switchMap, tap } from 'rxjs';
import { ProjectAccessService } from './project-access.service';
import { VisiblePageRefreshService } from './visible-page-refresh.service';

@Injectable({ providedIn: 'root' })
export class ProjectPermissionsRefreshService {
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly visiblePageRefresh = inject(VisiblePageRefreshService);

  // reads once and again after a long absence, stale permissions are only cosmetic
  // backend refuses anyway, a 403 is handled in refreshAfterForbidden
  watch(projectId: string): Observable<string[]> {
    return concat(
      of(null),
      this.visiblePageRefresh
        .onReturn(`project-permissions:${projectId}`)
        .pipe(tap(() => this.projectAccess.clear(projectId))),
    ).pipe(switchMap(() => this.projectAccess.getPermissions(projectId)));
  }

  refreshAfterForbidden(projectId: string): Observable<string[]> {
    this.projectAccess.clear(projectId);

    return this.projectAccess.getPermissions(projectId);
  }
}
