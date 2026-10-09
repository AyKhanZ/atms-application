import { signal } from '@angular/core';

export const APP_LANGUAGES = ['en', 'ru', 'az'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const UI_LANGUAGES: readonly { code: AppLanguage; nativeName: string }[] = [
  { code: 'az', nativeName: 'Azərbaycanca' },
  { code: 'en', nativeName: 'English' },
  { code: 'ru', nativeName: 'Русский' },
];

// LanguageService is the only writer. Formatters read it outside an injection context.
export const currentLanguage = signal<AppLanguage>('en');

// Angular ships en-US, not "en"; ru and az are registered at startup
export function angularLocale(language: AppLanguage = currentLanguage()): string {
  return language === 'en' ? 'en-US' : language;
}

export function toUiLanguage(code: string | null | undefined): AppLanguage | null {
  const normalized = code?.trim().toLowerCase();
  return APP_LANGUAGES.find((language) => language === normalized) ?? null;
}

export function toProfileCode(language: AppLanguage): string {
  return language.toUpperCase();
}
