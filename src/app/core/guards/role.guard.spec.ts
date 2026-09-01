import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, firstValueFrom, Observable, of } from 'rxjs';
import { Roles } from '../enums/roles.enum';
import { AuthSessionService } from '../services/auth-session.service';
import { UserStoreSelectors } from '../../store/user';
import { roleGuard } from './role.guard';

interface AuthStub {
  ready$: BehaviorSubject<boolean>;
  isAuthenticated: ReturnType<typeof vi.fn>;
}

async function runGuard(guard: CanActivateFn): Promise<unknown> {
  const result = TestBed.runInInjectionContext(() =>
    guard({} as never, { url: '/projects/create' } as never),
  );

  return firstValueFrom(result as Observable<unknown>);
}

describe('roleGuard', () => {
  let auth: AuthStub;
  let me$: BehaviorSubject<object | null>;
  let roles: { code: string }[];
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      ready$: new BehaviorSubject(true),
      isAuthenticated: vi.fn(() => true),
    };
    me$ = new BehaviorSubject<object | null>({});
    roles = [];
    router = { createUrlTree: vi.fn((commands: string[]) => commands.join('/')) };

    const store = {
      select: vi.fn((selector: unknown) =>
        selector === UserStoreSelectors.getMe ? me$ : of(undefined),
      ),
      selectSignal: vi.fn(() => () => roles),
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

    expect(await runGuard(roleGuard(Roles.SuperAdmin))).toBe('/login');
  });

  it('denies an authenticated user with an empty role set', async () => {
    expect(await runGuard(roleGuard(Roles.SuperAdmin))).toBe('/errors/403');
  });

  it('allows a user with the required role', async () => {
    roles = [{ code: Roles.SuperAdmin }];

    expect(await runGuard(roleGuard(Roles.SuperAdmin))).toBe(true);
  });
});
