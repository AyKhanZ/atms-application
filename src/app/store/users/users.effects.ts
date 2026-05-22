import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as UsersStoreActions from './users.actions';
import { UsersService } from '../../core/services/users.service';
import { SnackBarService } from '../../core/services/snack-bar.service';

@Injectable()
export class UsersEffects {
  private readonly actions$ = inject(Actions);
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(SnackBarService);

  // GET /users
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersStoreActions.loadUsers),
      switchMap(({ filter }) =>
        this.usersService.getUsers(filter).pipe(
          map((response) => UsersStoreActions.loadUsersSuccess({ response })),
          catchError((err) => {
            console.error('[users] Failed to load users', err);
            return of(UsersStoreActions.loadUsersFailure());
          }),
        ),
      ),
    ),
  );

  // GET /users/:id
  loadUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersStoreActions.loadUser),
      switchMap(({ id }) =>
        this.usersService.getUser(id).pipe(
          map((item) => UsersStoreActions.loadUserSuccess({ item })),
          catchError((err) => {
            console.error('[users] Failed to load user', err);
            return of(UsersStoreActions.loadUserFailure());
          }),
        ),
      ),
    ),
  );

  // PATCH /users/status/:id
  updateUserStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersStoreActions.updateUserStatus),
      switchMap(({ id, command }) =>
        this.usersService.updateUserStatus(id, command).pipe(
          map(() => UsersStoreActions.updateUserStatusSuccess({ id, command })),
          catchError((err) => {
            console.error('[users] Failed to update user status', err);
            return of(UsersStoreActions.updateUserStatusFailure());
          }),
        ),
      ),
    ),
  );

  updateUserStatusSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UsersStoreActions.updateUserStatusSuccess),
        tap(() => this.snackBar.success('User status successfully updated.')),
      ),
    { dispatch: false },
  );

  updateUserStatusFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UsersStoreActions.updateUserStatusFailure),
        tap(() => this.snackBar.error('Failed to update user status.')),
      ),
    { dispatch: false },
  );
}
