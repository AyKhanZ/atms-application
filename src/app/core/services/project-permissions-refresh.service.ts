import { inject, Injectable } from '@angular/core';
import { concat, Observable, of, switchMap, tap } from 'rxjs';
import { ProjectAccessService } from './project-access.service';
import { VisiblePageRefreshService } from './visible-page-refresh.service';

@Injectable({ providedIn: 'root' })
export class ProjectPermissionsRefreshService {
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly visiblePageRefresh = inject(VisiblePageRefreshService);

  watch(projectId: string): Observable<string[]> {
    return concat(
      of(null),
      this.visiblePageRefresh.every().pipe(
        tap(() => this.projectAccess.clear(projectId)),
      ),
    ).pipe(
      switchMap(() => this.projectAccess.getPermissions(projectId)),
    );
  }
}
