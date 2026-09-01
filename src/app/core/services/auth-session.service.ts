import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  BehaviorSubject,
  catchError,
  finalize,
  firstValueFrom,
  from,
  Observable,
  of,
  tap,
  throwError,
} from 'rxjs';
import { AuthStoreActions, AuthStoreSelectors } from '../../store/auth';
import { AccessModel } from '../models/auth/auth.models';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { isServerUnavailable, isTerminalRefreshError } from '../utils/http-error.utils';
import { hasCompletedOnboarding } from '../utils/jwt-claims.utils';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly api = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly readySubject = new BehaviorSubject(false);
  private refreshRequest: Promise<AccessModel> | null = null;

  readonly isServerUnavailable = signal(false);
  readonly ready$ = this.readySubject.asObservable();
  readonly accessModel = this.store.selectSignal(AuthStoreSelectors.getAccessModel);
  readonly isAuthenticated = computed(() => Boolean(this.accessModel()?.accessToken));
  readonly isOnboardingCompleted = computed(() =>
    hasCompletedOnboarding(this.accessModel()?.accessToken),
  );

  init(): Promise<void> {
    const saved = this.tokenStorage.getAccessModel();

    if (!saved?.refreshToken) {
      this.store.dispatch(AuthStoreActions.authReady());
      this.readySubject.next(true);
      return Promise.resolve();
    }

    if (!shouldRefreshAccessToken(saved.accessTokenExpireTime)) {
      this.store.dispatch(AuthStoreActions.restoreSession({ accessModel: saved }));
      this.store.dispatch(AuthStoreActions.authReady());
      this.readySubject.next(true);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.refreshAccessToken()
        .pipe(
          catchError((error: unknown) => {
            if (isServerUnavailable(error)) {
              this.isServerUnavailable.set(true);
              void this.router.navigate(['/server-unavailable']);
              return of(null);
            }

            if (isTerminalRefreshError(error) || error instanceof RefreshTokenMissingError) {
              this.tokenStorage.clear();
              return of(null);
            }

            this.isServerUnavailable.set(true);
            void this.router.navigate(['/server-unavailable']);
            return of(null);
          }),
          finalize(() => {
            this.store.dispatch(AuthStoreActions.authReady());
            this.readySubject.next(true);
            resolve();
          }),
        )
        .subscribe();
    });
  }

  refreshAccessToken(): Observable<AccessModel> {
    if (this.refreshRequest) {
      return from(this.refreshRequest);
    }

    const saved = this.tokenStorage.getAccessModel();
    if (!saved?.refreshToken) {
      return throwError(() => new RefreshTokenMissingError());
    }

    this.refreshRequest = this.refreshAcrossTabs(saved.refreshToken).finally(() => {
      this.refreshRequest = null;
    });

    return from(this.refreshRequest);
  }

  private refreshAcrossTabs(requestedRefreshToken: string): Promise<AccessModel> {
    const refresh = async (): Promise<AccessModel> => {
      const current = this.tokenStorage.getAccessModel();
      if (!current?.refreshToken) {
        throw new RefreshTokenMissingError();
      }

      if (current.refreshToken !== requestedRefreshToken) {
        this.applyAccessModel(current);
        return current;
      }

      return firstValueFrom(
        this.api
          .refresh({ refreshToken: current.refreshToken })
          .pipe(tap((accessModel) => this.applyAccessModel(accessModel))),
      );
    };

    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks
        .request<Promise<AccessModel>>('atms-auth-refresh', refresh)
        .then((accessModel) => accessModel);
    }

    return refresh();
  }

  private applyAccessModel(accessModel: AccessModel): void {
    this.isServerUnavailable.set(false);
    this.tokenStorage.save(accessModel);
    this.store.dispatch(AuthStoreActions.refreshTokenSuccess({ accessModel }));
  }

  logout(redirectToLogin = true): void {
    const refreshToken = this.tokenStorage.getAccessModel()?.refreshToken;
    if (refreshToken) {
      this.api.logout({ refreshToken }).subscribe({ error: () => undefined });
    }

    this.clearSession();

    if (redirectToLogin) {
      void this.router.navigate(['/login']);
    }
  }

  updateAccessToken(accessToken: string, accessTokenExpireTime: string): void {
    const current = this.tokenStorage.getAccessModel();
    if (!current?.refreshToken) {
      throw new Error('Refresh token is missing.');
    }

    const accessModel: AccessModel = {
      accessToken,
      accessTokenExpireTime,
      refreshToken: current.refreshToken,
    };
    this.tokenStorage.save(accessModel);
    this.store.dispatch(AuthStoreActions.refreshTokenSuccess({ accessModel }));
  }

  private clearSession(): void {
    this.tokenStorage.clear();
    this.store.dispatch(AuthStoreActions.logoutCompleted());
  }
}

export class RefreshTokenMissingError extends Error {
  constructor() {
    super('Refresh token is missing.');
  }
}

function shouldRefreshAccessToken(expiresAt: string): boolean {
  const expiresAtMs = new Date(expiresAt).getTime();
  const refreshBeforeMs = 60_000;

  return !Number.isFinite(expiresAtMs) || expiresAtMs - Date.now() <= refreshBeforeMs;
}
