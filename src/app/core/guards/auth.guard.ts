import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthStoreSelectors } from '../../store/auth';

/**
 * Guard проверяет авторизацию.
 *
 * Если не авторизован — редиректит на /login?returnUrl=...
 * После успешного логина AuthEffects читает returnUrl и возвращает пользователя назад.
 *
 * ВАЖНО: APP_INITIALIZER (auth.initializer.ts) восстанавливает Store из localStorage
 * ДО того как этот Guard срабатывает. Поэтому isLoggedIn будет корректным при F5.
 */
export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const store = inject(Store);
  const router = inject(Router);

  const isLoggedIn = store.selectSignal(AuthStoreSelectors.isLoggedIn)();

  if (!isLoggedIn) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  return true;
};
