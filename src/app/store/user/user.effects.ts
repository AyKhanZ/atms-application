import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { firstValueFrom, forkJoin, of, tap } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import * as UserStoreActions from './user.actions';
import * as AuthStoreActions from '../auth/auth.actions';
import { UserService } from '../../core/services/user.service';
import { LanguageService } from '../../core/services/language.service';
import { isServerUnavailable } from '../../core/utils/http-error.utils';
import { Router } from '@angular/router';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly userService = inject(UserService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  loadUserData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AuthStoreActions.loginSuccess,
        AuthStoreActions.restoreSession,
        AuthStoreActions.refreshTokenSuccess,
      ),
      switchMap((action) =>
        forkJoin({
          me: this.userService.getMe(),
          roles: this.userService.getRoles(),
          permissions: this.userService.getPermissions(),
        }).pipe(
          concatMap(async ({ me, roles, permissions }) => {
            // profile language before the first page, so its requests already carry it;
            // not on a token refresh: a language changed on another device must not reload mid-work
            const changed =
              action.type !== AuthStoreActions.refreshTokenSuccess.type &&
              (await this.language.applyProfile(
                me.language,
                roles,
                action.type === AuthStoreActions.loginSuccess.type ? 'activate' : 'reload',
              ));
            const nextRoles = changed
              ? await firstValueFrom(this.userService.getRoles())
              : roles;
            if (action.type === AuthStoreActions.loginSuccess.type) {
              const returnUrl =
                this.router.parseUrl(this.router.url).queryParams['returnUrl'] ?? '/dashboard';
              void this.router.navigateByUrl(returnUrl);
            }
            return UserStoreActions.loadUserDataSuccess({
              me,
              roles: nextRoles,
              permissions,
            });
          }),
          catchError((error) =>
            of(
              UserStoreActions.loadUserDataFailure({
                isServerUnavailable: isServerUnavailable(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  loadUserDataFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UserStoreActions.loadUserDataFailure),
        tap(({ isServerUnavailable }) =>
          this.router.navigate([isServerUnavailable ? '/server-unavailable' : '/login']),
        ),
      ),
    { dispatch: false },
  );

  clearOnLogout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.logoutCompleted),
      map(() => UserStoreActions.clearAll()),
    ),
  );
}
