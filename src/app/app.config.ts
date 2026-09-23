import {
  ApplicationConfig,
  provideAppInitializer,
  inject,
  provideZonelessChangeDetection,
  isDevMode,
} from '@angular/core';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
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
import { OrganizationsEffects } from './store/organizations/organizations.effects';
import { DictionaryEffects } from './store/dictionary/dictionary.effects';
import { Features } from './store/features.enum';
import { dictionaryReducer } from './store/dictionary/dictionary.reducer';
import { organizationsReducer } from './store/organizations/organizations.reducer';
import { workProjectsReducer } from './store/work-projects/work-projects.reducer';
import { WorkProjectsEffects } from './store/work-projects/work-projects.effects';
import { workGroupsReducer } from './store/work-groups/work-groups.reducer';
import { WorkGroupsEffects } from './store/work-groups/work-groups.effects';
import { globalSearchReducer } from './store/global-search/global-search.reducer';
import { GlobalSearchEffects } from './store/global-search/global-search.effects';
import { workTicketsReducer } from './store/work-tickets/work-tickets.reducer';
import { WorkTicketsEffects } from './store/work-tickets/work-tickets.effects';
import { workTasksReducer } from './store/work-tasks/work-tasks.reducer';
import { WorkTasksEffects } from './store/work-tasks/work-tasks.effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { NavigationHistoryService } from './core/services/navigation-history.service';
import { AppRouteReuseStrategy } from './core/routing/app-route-reuse.strategy';
import { taskBoardReducer } from './store/task-board/task-board.reducer';
import { TaskBoardEffects } from './store/task-board/task-board.effects';

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
        list: {
          option: {
            focusBackground: '#fff7ed',
            focusColor: '{text.color}',
            selectedBackground: '#fff1e1',
            selectedColor: '{primary.600}',
            selectedFocusBackground: '#fff1e1',
            selectedFocusColor: '{primary.700}',
          },
        },
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      // On a narrow screen a panel is about as wide as the window, so anchoring it to its field
      // means it either points at the field or stays clear of the edges — never both. Below this
      // width every overlay comes up as a sheet from the bottom with a backdrop instead.
      overlayOptions: {
        responsive: { breakpoint: '768px', direction: 'bottom' },
      },
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
      [Features.Organizations]: organizationsReducer,
      [Features.WorkProjects]: workProjectsReducer,
      [Features.WorkGroups]: workGroupsReducer,
      [Features.GlobalSearch]: globalSearchReducer,
      [Features.WorkTickets]: workTicketsReducer,
      [Features.WorkTasks]: workTasksReducer,
      [Features.TaskBoard]: taskBoardReducer,
      [Features.User]: userReducer,
      [Features.Dictionary]: dictionaryReducer,
    }),
    provideEffects([
      AuthEffects,
      UsersEffects,
      OrganizationsEffects,
      WorkProjectsEffects,
      WorkGroupsEffects,
      GlobalSearchEffects,
      WorkTicketsEffects,
      WorkTasksEffects,
      TaskBoardEffects,
      UserEffects,
      DictionaryEffects,
    ]),
    provideAppInitializer(authInitializer),
    // Started before the first navigation, so Back knows the page the user arrived from.
    provideAppInitializer(() => {
      inject(NavigationHistoryService);
    }),
    provideZonelessChangeDetection(),
    // Redux DevTools
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
    MessageService,
  ],
};
