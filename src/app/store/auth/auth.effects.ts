import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, tap, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import * as AuthStoreActions from './auth.actions';
import { AuthService } from '../../core/services/auth.service';
import { ValidationErrorModel } from '../../core/models/auth/auth.models';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
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
          localStorage.setItem('accessToken', accessModel.accessToken);
          localStorage.setItem('refreshToken', accessModel.refreshToken);
          localStorage.setItem('tokenExpireTime', accessModel.accessTokenExpireTime);

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
        const expireTime = new Date(accessModel.accessTokenExpireTime).getTime();
        const delay = expireTime - Date.now() - 60_000*24.5; // за 60 сек до истечения
        if (delay <= 0) {
          // Токен уже истёк или истекает меньше чем через минуту — рефрешим сразу
          return of(AuthStoreActions.refreshToken());
        }

        return timer(delay).pipe(map(() => AuthStoreActions.refreshToken()));
      }),
    ),
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.refreshToken),
      switchMap(() => {
        const refreshToken = localStorage.getItem('refreshToken') ?? '';
        return this.authService.refresh({ refreshToken }).pipe(
          map((accessModel) => AuthStoreActions.refreshTokenSuccess({ accessModel })),
          catchError(() => of(AuthStoreActions.logout())),
        );
      }),
    ),
  );

  refreshTokenSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.refreshTokenSuccess),
        tap(({ accessModel }) => {
          localStorage.setItem('accessToken', accessModel.accessToken);
          localStorage.setItem('refreshToken', accessModel.refreshToken);
          localStorage.setItem('tokenExpireTime', accessModel.accessTokenExpireTime);
        }),
      ),
    { dispatch: false },
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthStoreActions.logout),
        tap(() => {
          const refreshToken = localStorage.getItem('refreshToken') ?? '';
          this.authService.logout({ refreshToken }).subscribe();
          localStorage.clear();
          void this.router.navigate(['/login']);
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
