import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { BehaviorSubject, catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { AuthStoreActions, AuthStoreSelectors } from '../../store/auth';
import { AccessModel } from '../models/auth/auth.models';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { isServerUnavailable } from '../utils/http-error.utils';
import { hasCompletedOnboarding } from '../utils/jwt-claims.utils';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly api = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly readySubject = new BehaviorSubject(false);
  private refreshRequest$: Observable<AccessModel> | null = null;

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
          catchError((error: HttpErrorResponse) => {
            if (isServerUnavailable(error)) {
              this.isServerUnavailable.set(true);
              void this.router.navigate(['/server-unavailable']);
              return of(null);
            }

            this.tokenStorage.clear();
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
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const saved = this.tokenStorage.getAccessModel();
    if (!saved?.refreshToken) {
      return throwError(() => new Error('Refresh token is missing.'));
    }

    this.refreshRequest$ = this.api.refresh({ refreshToken: saved.refreshToken }).pipe(
      tap((accessModel) => {
        this.isServerUnavailable.set(false);
        this.tokenStorage.save(accessModel);
        this.store.dispatch(AuthStoreActions.refreshTokenSuccess({ accessModel }));
      }),
      finalize(() => {
        this.refreshRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.refreshRequest$;
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

function shouldRefreshAccessToken(expiresAt: string): boolean {
  const expiresAtMs = new Date(expiresAt).getTime();
  const refreshBeforeMs = 60_000;

  return !Number.isFinite(expiresAtMs) || expiresAtMs - Date.now() <= refreshBeforeMs;
}
