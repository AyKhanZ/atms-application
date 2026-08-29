import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, Observable, of, throwError } from 'rxjs';
import { ProjectPermissions } from '../enums/project-permissions.enum';
import { AuthSessionService } from '../services/auth-session.service';
import { ProjectAccessService } from '../services/project-access.service';
import { projectPermissionGuard } from './project-permission.guard';

interface AuthStub {
  ready$: BehaviorSubject<boolean>;
  isAuthenticated: ReturnType<typeof vi.fn>;
}

async function runGuard(guard: CanActivateFn, projectId: string | null = 'project-1'): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() =>
    guard(
      { paramMap: convertToParamMap(projectId ? { id: projectId } : {}) } as never,
      { url: projectId ? `/projects/${projectId}` : '/projects' } as never,
    ),
  );

  return firstValueFrom(result as Observable<unknown>);
}

describe('projectPermissionGuard', () => {
  let auth: AuthStub;
  let hasPermission: ReturnType<typeof vi.fn>;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      ready$: new BehaviorSubject(true),
      isAuthenticated: vi.fn(() => true),
    };
    hasPermission = vi.fn(() => of(true));
    router = { createUrlTree: vi.fn((commands: string[]) => commands.join('/')) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: auth },
        { provide: ProjectAccessService, useValue: { hasPermission } },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirects an unauthenticated user to login', async () => {
    auth.isAuthenticated.mockReturnValue(false);

    expect(await runGuard(projectPermissionGuard(ProjectPermissions.Project.View))).toBe('/login');
  });

  it('allows a user with the required project permission', async () => {
    expect(await runGuard(projectPermissionGuard(ProjectPermissions.Project.View))).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith('project-1', ProjectPermissions.Project.View);
  });

  it('denies a user without the required project permission', async () => {
    hasPermission.mockReturnValue(of(false));

    expect(await runGuard(projectPermissionGuard(ProjectPermissions.Project.Edit))).toBe('/errors/403');
  });

  it('denies when the route has no project id', async () => {
    expect(await runGuard(projectPermissionGuard(ProjectPermissions.Project.View), null)).toBe('/errors/403');
  });

  it('redirects to server unavailable for unavailable project permission endpoint', async () => {
    hasPermission.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' })),
    );

    expect(await runGuard(projectPermissionGuard(ProjectPermissions.Project.View))).toBe('/server-unavailable');
  });
});
