import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, tap } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import * as UserStoreActions from './user.actions';
import * as AuthStoreActions from '../auth/auth.actions';
import { UserService } from '../../core/services/user.service';
import { Router } from '@angular/router';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  loadUserData$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.loginSuccess, AuthStoreActions.restoreSession),
      switchMap(() =>
        forkJoin([
          this.userService.getMe(),
          this.userService.getRoles(),
          this.userService.getPermissions(),
        ]).pipe(
          map(([me, roles, permissions]) =>
            UserStoreActions.loadUserDataSuccess({ me, roles, permissions }),
          ),
          catchError(() => of(UserStoreActions.loadUserDataFailure())),
        ),
      ),
    ),
  );

  loadUserDataFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UserStoreActions.loadUserDataFailure),
        tap(() => this.router.navigate(['/login'])),
      ),
    { dispatch: false },
  );

  clearOnLogout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthStoreActions.logout),
      map(() => UserStoreActions.clearAll()),
    ),
  );
}
