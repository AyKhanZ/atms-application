import { HttpClient } from '@angular/common/http';
import { DOCUMENT, inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
import { PrimeNG } from 'primeng/config';
import { firstValueFrom } from 'rxjs';
import { adminApiUrl } from '../constants/api-url.constants';
import { primeNgLocale } from '../constants/primeng-locales';
import { UserStoreSelectors } from '../../store/user';
import { isSuperAdmin } from '../utils/super-admin.utils';
import { AuthSessionService } from './auth-session.service';
import { HealthService } from './health.service';
import { ProfileService } from './profile.service';
import { SnackBarService } from './snack-bar.service';
import {
  AppLanguage,
  currentLanguage,
  toProfileCode,
  toUiLanguage,
} from '../i18n/active-language';

const STORAGE_KEY = 'language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly http = inject(HttpClient);
  private readonly health = inject(HealthService);
  private readonly transloco = inject(TranslocoService);
  private readonly primeNg = inject(PrimeNG);
  private readonly document = inject(DOCUMENT);
  private readonly snackBar = inject(SnackBarService);
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthSessionService);
  private readonly store = inject(Store);
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);
  private startup: Promise<boolean> | null = null;

  readonly current = currentLanguage.asReadonly();

  // health and the default language start together; auth waits on the same promise
  init(): Promise<boolean> {
    return (this.startup ??= this.bootstrap());
  }

  async use(code: AppLanguage): Promise<void> {
    if (code === this.current()) return;
    this.remember(code);
    await this.activate(code);
  }

  async switch(code: AppLanguage): Promise<void> {
    if (code === this.current()) return;

    if (this.shouldPatchProfile()) {
      try {
        await firstValueFrom(this.profile.updateLanguage(toProfileCode(code)));
      } catch {
        this.snackBar.error(this.transloco.translate('language.changeFailed'));
        return;
      }
    }

    this.remember(code);
    this.document.location.reload();
  }

  // profile wins after onboarding; login activates in place, a running tab reloads once
  async applyProfile(
    profileCode: string,
    roles: readonly { code: string }[],
    mode: 'activate' | 'reload',
  ): Promise<boolean> {
    if (!this.auth.isOnboardingCompleted() || isSuperAdmin(roles)) return false;

    const code = toUiLanguage(profileCode);
    if (!code) return false;
    if (this.current() === code && this.readStored() === code) return false;

    this.remember(code);
    if (this.current() === code) return false;

    if (mode === 'reload') {
      this.document.location.reload();
      return new Promise(() => undefined);
    }

    await this.activate(code);
    return true;
  }

  rememberAndReload(code: AppLanguage): void {
    if (code === this.current() && this.readStored() === code) return;
    this.remember(code);
    if (code !== this.current()) this.document.location.reload();
  }

  private async bootstrap(): Promise<boolean> {
    const healthOk = firstValueFrom(this.health.check()).then(
      () => true,
      () => false,
    );
    const stored = this.readStored();
    if (stored) {
      const [, ok] = await Promise.all([this.activate(stored), healthOk]);
      return ok;
    }

    const [language, ok] = await Promise.all([this.fetchDefault(), healthOk]);
    await this.activate(language);
    return ok;
  }

  private async fetchDefault(): Promise<AppLanguage> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ defaultLanguage: string }>(`${adminApiUrl}/localization`),
      );
      return toUiLanguage(response.defaultLanguage) ?? 'en';
    } catch {
      return 'en';
    }
  }

  private async activate(code: AppLanguage): Promise<void> {
    try {
      await firstValueFrom(this.transloco.load(code));
    } catch {
      if (code !== 'en') {
        await this.activate('en');
        return;
      }
    }

    this.transloco.setActiveLang(code);
    currentLanguage.set(code);
    this.document.documentElement.lang = code;
    this.primeNg.setTranslation(primeNgLocale(code));
    const title = this.transloco.translate('app.title');
    if (title && title !== 'app.title') this.document.title = title;
  }

  private shouldPatchProfile(): boolean {
    return (
      this.auth.isAuthenticated() &&
      this.auth.isOnboardingCompleted() &&
      !isSuperAdmin(this.roles())
    );
  }

  private remember(code: AppLanguage): void {
    localStorage.setItem(STORAGE_KEY, code);
  }

  private readStored(): AppLanguage | null {
    return toUiLanguage(localStorage.getItem(STORAGE_KEY));
  }
}
