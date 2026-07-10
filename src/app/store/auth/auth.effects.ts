import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, tap, timer } from 'rxjs';
import { catchError, map, switchMap, takeUntil } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import * as AuthStoreActions from './auth.actions';
import { AuthService } from '../../core/services/auth.service';
import { ValidationErrorModel } from '../../core/models/auth/auth.models';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { Router } from '@angular/router';
import { TokenStorageService } from '../../core/services/token-storage.service';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly snackBar = inject(SnackBarService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.login),
      switchMap(({ command }) =>
        this.authService.login(command).pipe(
          map((accessModel) => AuthStoreActions.loginSuccess({ accessModel })),
          catchError((err: HttpErrorResponse) =>
            of(AuthStoreActions.loginFailure({ errors: this.mapErrors(err) })),
          ),
        ),
      ),
    ),
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.loginSuccess),
        tap(({ accessModel }) => {
          this.tokenStorage.save(accessModel);

          // ← Читаем returnUrl — если Guard сохранил его, вернём пользователя туда
          // Например: /users?page=2&pageSize=30 → после логина попадёт обратно
          const returnUrl =
            this.router.parseUrl(this.router.url).queryParams['returnUrl'] ?? '/dashboard';
          void this.router.navigateByUrl(returnUrl);

          setTimeout(() => this.snackBar.success('You have successfully logged in!'));
        }),
      ),
    { dispatch: false },
  );

  loginFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.loginFailure),
        tap(({ errors }) => errors.forEach((e) => this.snackBar.error(e))),
      ),
    { dispatch: false },
  );

  /**
   * Планирует обновление токена за 60 секунд до истечения.
   * Срабатывает на loginSuccess, restoreSession (F5!) и refreshTokenSuccess.
   */
  scheduleTokenRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AuthStoreActions.loginSuccess,
        AuthStoreActions.restoreSession,
        AuthStoreActions.refreshTokenSuccess,
      ),
      switchMap(({ accessModel }) => {
        return timer(getRefreshDelay(accessModel.accessTokenExpireTime)).pipe(
          map(() => AuthStoreActions.refreshToken()),
          takeUntil(this.actions$.pipe(ofType(AuthStoreActions.logout, AuthStoreActions.logoutCompleted))),
        );
      }),
    ),
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.refreshToken),
      switchMap(() => {
        const refreshToken = this.tokenStorage.getAccessModel()?.refreshToken;
        if (!refreshToken) {
          return of(AuthStoreActions.refreshTokenFailure());
        }

        return this.authService.refresh({ refreshToken }).pipe(
          map((accessModel) => AuthStoreActions.refreshTokenSuccess({ accessModel })),
          catchError(() => of(AuthStoreActions.refreshTokenFailure())),
        );
      }),
    ),
  );

  refreshTokenSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.refreshTokenSuccess),
        tap(({ accessModel }) => {
          this.tokenStorage.save(accessModel);
        }),
      ),
    { dispatch: false },
  );

  refreshTokenFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.refreshTokenFailure),
        tap(() => {
          this.tokenStorage.clear();
          if (this.router.url !== '/server-unavailable') {
            void this.router.navigate(['/login']);
          }
        }),
      ),
    { dispatch: false },
  );

  restoreSession$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.restoreSession, AuthStoreActions.refreshTokenSuccess),
        tap(({ accessModel }) => this.tokenStorage.save(accessModel)),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.logout),
      switchMap(() => {
        const refreshToken = this.tokenStorage.getAccessModel()?.refreshToken;
        const request$ = refreshToken
          ? this.authService.logout({ refreshToken }).pipe(catchError(() => of(undefined)))
          : of(undefined);

        return request$.pipe(map(() => AuthStoreActions.logoutCompleted()));
      }),
    ),
  );

  logoutCompleted$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.logoutCompleted),
        tap(() => {
          this.tokenStorage.clear();
          if (this.router.url !== '/server-unavailable') {
            void this.router.navigate(['/login']);
          }
        }),
      ),
    { dispatch: false },
  );

  private mapErrors(err: HttpErrorResponse): string[] {
    switch (err.status) {
      case 400: {
        const body = err.error as ValidationErrorModel;
        return body.errors?.map((e) => `${e.field}: ${e.error}`) ?? [body.message];
      }
      case 401:
        return [err.error?.error ?? 'Invalid email or password.'];
      case 423:
        return [err.error ?? 'Account temporarily locked.'];
      default:
        return [err.error?.message ?? 'Unexpected server error.'];
    }
  }
}

function getRefreshDelay(expiresAt: string): number {
  const expiresAtMs = new Date(expiresAt).getTime();
  const refreshBeforeMs = 60_000;
  const fallbackMs = 30_000;
  const delay = expiresAtMs - Date.now() - refreshBeforeMs;

  return Number.isFinite(delay) && delay > 0 ? delay : fallbackMs;
}
