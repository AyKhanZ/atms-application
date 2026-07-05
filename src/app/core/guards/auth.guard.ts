import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';

/**
 * Guard проверяет авторизацию.
 *
 * Если не авторизован — редиректит на /login?returnUrl=...
 * После успешного логина AuthEffects читает returnUrl и возвращает пользователя назад.
 *
 * ВАЖНО: APP_INITIALIZER (auth.initializer.ts) восстанавливает Store из localStorage
 * ДО того как этот Guard срабатывает. Поэтому isLoggedIn будет корректным при F5.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthSessionService);
  const router = inject(Router);

  return auth.ready$.pipe(
    filter(Boolean),
    take(1),
    map(() =>
      auth.isServerUnavailable()
        ? router.createUrlTree(['/server-unavailable'], { queryParams: { returnUrl: state.url } })
        : auth.isAuthenticated()
          ? true
          : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
