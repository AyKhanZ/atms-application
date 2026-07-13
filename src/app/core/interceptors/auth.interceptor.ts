import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError, timeout } from 'rxjs';
import { API_TIMEOUT_MS, isServerUnavailable } from '../utils/http-error.utils';
import { AuthSessionService } from '../services/auth-session.service';

const PUBLIC_ENDPOINTS = [
  '/health',
  '/auth/login',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/account/email-confirmation/resend',
];

/**
 * Функциональный интерцептор (Angular 17+).
 * Читает accessToken из Store и добавляет заголовок Authorization.
 * Не трогает публичные эндпоинты (login, refresh и т.д.).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);
  const accessToken = auth.accessModel()?.accessToken;

  // Кому не нужно добавлять заголовок
  const isPublic = PUBLIC_ENDPOINTS.some((url) => req.url.includes(url));
  const isLogout = req.url.includes('/auth/logout');

  const request = !isPublic && accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : req;

  return next(request).pipe(
    timeout({ first: API_TIMEOUT_MS }),
    catchError((error: unknown) => {
      if (isServerUnavailable(error)) {
        const returnUrl = router.url.startsWith('/server-unavailable') ? '/dashboard' : router.url;
        void router.navigate(['/server-unavailable'], {
          queryParams: { returnUrl },
          replaceUrl: true,
        });
      }

      if (isPublic || isLogout || !(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        switchMap((accessModel) => {
          const retry = req.clone({
            setHeaders: {
              Authorization: `Bearer ${accessModel.accessToken}`,
            },
          });

          return next(retry).pipe(timeout({ first: API_TIMEOUT_MS }));
        }),
        catchError((refreshError) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
