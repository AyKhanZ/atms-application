import { Translation } from 'primeng/api';
import { az } from 'primelocale/js/az.js';
import { en } from 'primelocale/js/en.js';
import { ru } from 'primelocale/js/ru.js';
import { AppLanguage } from '../i18n/active-language';

const locales: Record<AppLanguage, Translation> = {
  en: { ...en, firstDayOfWeek: 1 },
  ru: { ...ru, firstDayOfWeek: 1 },
  az: { ...az, firstDayOfWeek: 1 },
};

export function primeNgLocale(language: AppLanguage): Translation {
  return locales[language];
}
