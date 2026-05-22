import { HttpInterceptorFn } from '@angular/common/http';
import { AuthStoreSelectors } from '../../store/auth';
import { Store } from '@ngrx/store';
import { inject } from '@angular/core';

/**
 * Функциональный интерцептор (Angular 17+).
 * Читает accessToken из Store и добавляет заголовок Authorization.
 * Не трогает публичные эндпоинты (login, refresh и т.д.).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(Store);
  const accessModel = store.selectSignal(AuthStoreSelectors.getAccessModel)();

  // Кому не нужно добавлять заголовок
  const isPublic =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  if (isPublic || !accessModel?.accessToken) {
    return next(req);
  }

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessModel.accessToken}`,
    },
  });

  return next(cloned);
};

