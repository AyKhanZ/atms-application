import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { routes } from './app.routes';
import { authInitializer } from './core/initializers/auth.initializer';
import { authInterceptor } from './core/interceptors/auth.interceptor';

import { authReducer } from './store/auth/auth.reducer';
import { usersReducer } from './store/users/users.reducer';
import { userReducer } from './store/user/user.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { UserEffects } from './store/user/user.effects';
import { UsersEffects } from './store/users/users.effects';
import { DictionaryEffects } from './store/dictionary/dictionary.effects';
import { Features } from './store/features.enum';
import { dictionaryReducer } from './store/dictionary/dictionary.reducer';
import { provideStoreDevtools } from '@ngrx/store-devtools';

const BaimTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#fe9312',
      600: '#ea7600',
      700: '#c25e00',
      800: '#9a4a00',
      900: '#783b00',
      950: '#431f00',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f7f8fa',
          100: '#eeeeee',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#222222',
          900: '#111827',
          950: '#030712',
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: BaimTheme,
        options: {
          darkModeSelector: '.app-dark',
          cssLayer: {
            name: 'primeng',
            order: 'app, primeng',
          },
        },
      },
    }),
    provideStore({
      [Features.Auth]: authReducer,
      [Features.Users]: usersReducer,
      [Features.User]: userReducer,
      [Features.Dictionary]: dictionaryReducer,
    }),
    provideEffects([AuthEffects, UsersEffects, UserEffects, DictionaryEffects]),
    provideAppInitializer(authInitializer),
    provideZonelessChangeDetection(),
    // Redux DevTools
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
    MessageService,
  ],
};
