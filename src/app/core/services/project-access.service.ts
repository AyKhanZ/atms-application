import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { ProjectPermission } from '../enums/project-permissions.enum';

@Injectable({ providedIn: 'root' })
export class ProjectAccessService {
  private static readonly cacheTtlMs = 60_000;

  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, ProjectPermissionsCacheEntry>();
  private readonly versions = new Map<string, WritableSignal<number>>();

  getPermissions(projectId: string): Observable<string[]> {
    const cached = this.cache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions$;

    const permissions$ = this.http
      .get<string[]>(`${projectApiUrl}/project/${projectId}/my-permissions`)
      .pipe(
        catchError((error: unknown) => {
          this.cache.delete(projectId);
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.cache.set(projectId, {
      expiresAt: Date.now() + ProjectAccessService.cacheTtlMs,
      permissions$,
    });

    return permissions$;
  }

  hasPermission(projectId: string, permission: ProjectPermission | string): Observable<boolean> {
    return this.getPermissions(projectId).pipe(
      map((permissions) => permissions.includes(permission)),
    );
  }

  version(projectId: string): number {
    return this.getVersion(projectId)();
  }

  clear(projectId: string): void {
    this.cache.delete(projectId);
    this.getVersion(projectId).update((version) => version + 1);
  }

  clearAll(): void {
    this.cache.clear();
    this.versions.forEach((version) => version.update((value) => value + 1));
  }

  private getVersion(projectId: string): WritableSignal<number> {
    let version = this.versions.get(projectId);
    if (!version) {
      version = signal(0);
      this.versions.set(projectId, version);
    }

    return version;
  }
}

interface ProjectPermissionsCacheEntry {
  expiresAt: number;
  permissions$: Observable<string[]>;
}
