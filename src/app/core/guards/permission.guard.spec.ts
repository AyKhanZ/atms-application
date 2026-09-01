import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, firstValueFrom, of } from 'rxjs';
import { Roles } from '../enums/roles.enum';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';
import { permissionGuard } from './permission.guard';

interface AuthStub {
  ready$: BehaviorSubject<boolean>;
  isAuthenticated: ReturnType<typeof vi.fn>;
}

async function runGuard(guard: CanActivateFn): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() =>
    guard({} as never, { url: '/users' } as never),
  );
  return firstValueFrom(result as Observable<unknown>);
}

describe('permissionGuard', () => {
  let auth: AuthStub;
  let me$: BehaviorSubject<object | null>;
  let permissions: string[];
  let roles: { code: string }[];
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      ready$: new BehaviorSubject(true),
      isAuthenticated: vi.fn(() => true),
    };
    me$ = new BehaviorSubject<object | null>({});
    permissions = [];
    roles = [];
    router = { createUrlTree: vi.fn((commands: string[]) => commands.join('/')) };

    const store = {
      select: vi.fn((selector: unknown) =>
        selector === UserStoreSelectors.getMe ? me$ : of(undefined),
      ),
      selectSignal: vi.fn((selector: unknown) => () =>
        selector === UserStoreSelectors.getPermissions ? permissions : roles,
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: auth },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('redirects an unauthenticated user to login', async () => {
    auth.isAuthenticated.mockReturnValue(false);

    expect(await runGuard(permissionGuard('UserView'))).toBe('/login');
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/users' },
    });
  });

  it('denies an authenticated user with an empty permission set', async () => {
    expect(await runGuard(permissionGuard('UserView'))).toBe('/errors/403');
  });

  it('allows a user with the required permission', async () => {
    permissions = ['UserView'];

    expect(await runGuard(permissionGuard('UserView'))).toBe(true);
  });

  it('allows a super administrator without explicit permissions', async () => {
    roles = [{ code: Roles.SuperAdmin }];

    expect(await runGuard(permissionGuard('UserView'))).toBe(true);
  });

  it('waits until user authorization data is loaded', async () => {
    me$.next(null);
    permissions = ['UserView'];
    const result = runGuard(permissionGuard('UserView'));

    me$.next({});

    expect(await result).toBe(true);
  });
});
