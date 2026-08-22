import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { of, ReplaySubject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthEffects } from './auth.effects';
import * as AuthStoreActions from './auth.actions';

describe('AuthEffects', () => {
  let actions$: ReplaySubject<unknown>;
  let effects: AuthEffects;
  let authSession: { refreshAccessToken: ReturnType<typeof vi.fn> };
  let authService: { refresh: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    actions$ = new ReplaySubject<unknown>(1);
    authSession = { refreshAccessToken: vi.fn() };
    authService = { refresh: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        { provide: AuthSessionService, useValue: authSession },
        { provide: AuthService, useValue: authService },
        {
          provide: Router,
          useValue: { url: '/', parseUrl: vi.fn(), navigate: vi.fn(), navigateByUrl: vi.fn() },
        },
        {
          provide: TokenStorageService,
          useValue: { getAccessModel: vi.fn(), save: vi.fn(), clear: vi.fn() },
        },
        { provide: SnackBarService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });

    effects = TestBed.inject(AuthEffects);
  });

  it('routes scheduled refresh through the shared auth session request', () => {
    const accessModel = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpireTime: new Date(Date.now() + 60_000).toISOString(),
    };
    authSession.refreshAccessToken.mockReturnValue(of(accessModel));

    const emittedAction = vi.fn();
    const subscription = effects.refreshToken$.subscribe(emittedAction);
    actions$.next(AuthStoreActions.refreshToken());

    expect(authSession.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(authService.refresh).not.toHaveBeenCalled();
    expect(emittedAction).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
