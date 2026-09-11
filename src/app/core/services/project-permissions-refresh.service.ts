import { inject, Injectable } from '@angular/core';
import { concat, Observable, of, switchMap, tap } from 'rxjs';
import { ProjectAccessService } from './project-access.service';
import { VisiblePageRefreshService } from './visible-page-refresh.service';

@Injectable({ providedIn: 'root' })
export class ProjectPermissionsRefreshService {
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly visiblePageRefresh = inject(VisiblePageRefreshService);

  /**
   * Reads the permissions once and again when the user returns to the tab after a long absence.
   * Stale permissions in the UI are cosmetic — the backend rejects the request either way — so
   * the sharper signal is a 403, handled by `refreshAfterForbidden`.
   */
  watch(projectId: string): Observable<string[]> {
    return concat(
      of(null),
      this.visiblePageRefresh
        .onReturn(`project-permissions:${projectId}`)
        .pipe(tap(() => this.projectAccess.clear(projectId))),
    ).pipe(switchMap(() => this.projectAccess.getPermissions(projectId)));
  }

  /** Re-reads permissions after the server refused an action, so the UI stops offering it. */
  refreshAfterForbidden(projectId: string): Observable<string[]> {
    this.projectAccess.clear(projectId);

    return this.projectAccess.getPermissions(projectId);
  }
}
