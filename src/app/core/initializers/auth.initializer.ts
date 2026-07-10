import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { HealthService } from '../services/health.service';

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
export async function authInitializer(): Promise<void> {
  const auth = inject(AuthSessionService);
  const health = inject(HealthService);
  const router = inject(Router);
  const document = inject(DOCUMENT);
  const returnUrl = `${document.location.pathname}${document.location.search}${document.location.hash}`;

  try {
    await firstValueFrom(health.check());
  } catch {
    await router.navigate(['/server-unavailable'], {
      queryParams: { returnUrl },
      replaceUrl: true,
    });
    return;
  }

  return auth.init();
}
