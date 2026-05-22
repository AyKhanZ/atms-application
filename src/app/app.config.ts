import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
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
  ],
};
