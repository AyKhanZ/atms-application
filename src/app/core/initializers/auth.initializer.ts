import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../store/auth';
import { AccessModel } from '../models/auth/auth.models';

/**
 * provideAppInitializer — запускается СИНХРОННО до первого Guard'а.
 * Читает токены из localStorage и восстанавливает сессию в Store.
 *
 * БЕЗ ЭТОГО:
 *   F5 → Store пустой → Guard видит isLoggedIn=false → редирект на /login
 *
 * С ЭТИМ:
 *   F5 → authInitializer восстанавливает accessModel в Store
 *       → Guard видит isLoggedIn=true → пропускает на нужный роут
 */
export function authInitializer(): void {
  const store = inject(Store);

  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const accessTokenExpireTime = localStorage.getItem('tokenExpireTime');

  if (!accessToken || !refreshToken || !accessTokenExpireTime) {
    return;
  }

  const accessModel: AccessModel = {
    accessToken,
    refreshToken,
    accessTokenExpireTime,
  };

  // Диспатчим restoreSession — effect подхватит и запланирует refresh токена
  store.dispatch(AuthStoreActions.restoreSession({ accessModel }));
}
