import { EnvironmentProviders, Provider } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import en from '../../../../public/i18n/en.json';

// specs keep asserting the English sentence; the key is only in the template
export function translocoTestingProviders(): (Provider | EnvironmentProviders)[] {
  const testing = TranslocoTestingModule.forRoot({
    langs: { en },
    preloadLangs: true,
    translocoConfig: {
      availableLangs: ['en', 'ru', 'az'],
      defaultLang: 'en',
      fallbackLang: 'en',
    },
  });

  return [...(testing.providers ?? []), provideTranslocoMessageformat({ locales: ['en'] })];
}
