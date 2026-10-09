import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { UserStatus } from '../../core/enums/user-status.enum';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { UsersService } from '../../core/services/users.service';
import { serverErrorMessage } from '../../core/utils/http-error.utils';
import * as UsersStoreActions from './users.actions';
import * as UsersStoreSelectors from './users.selectors';

@Injectable()
export class UsersEffects {
  private readonly actions$ = inject(Actions);
  private readonly usersService = inject(UsersService);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);
  private readonly store = inject(Store);
  private readonly openUser = this.store.selectSignal(UsersStoreSelectors.getItem);

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

  registerUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersStoreActions.registerUser),
      switchMap(({ command }) =>
        this.usersService.registerUser(command).pipe(
          map((item) => UsersStoreActions.registerUserSuccess({ item })),
          catchError((err) => {
            console.error('[users] Failed to register user', err);
            return of(UsersStoreActions.registerUserFailure());
          }),
        ),
      ),
    ),
  );
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

  updateUserStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersStoreActions.updateUserStatus),
      switchMap(({ id, command }) =>
        this.usersService.updateUserStatus(id, command).pipe(
          map(() => UsersStoreActions.updateUserStatusSuccess({ id, command })),
          catchError((err: unknown) => {
            console.error('[users] Failed to update user status', err);
            const message =
              err instanceof HttpErrorResponse
                ? serverErrorMessage(err, this.transloco.translate('users.statusFailed'))
                : this.transloco.translate('users.statusFailed');
            return of(UsersStoreActions.updateUserStatusFailure({ message }));
          }),
        ),
      ),
    ),
  );

  registerUserSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UsersStoreActions.registerUserSuccess),
        tap(() => this.snackBar.success(this.transloco.translate('users.invited'))),
      ),
    { dispatch: false },
  );

  registerUserFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UsersStoreActions.registerUserFailure),
        tap(() => this.snackBar.error(this.transloco.translate('users.registerFailed'))),
      ),
    { dispatch: false },
  );
  // the status name is translated on the server, so the open card is read again
  reloadAfterStatusChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UsersStoreActions.updateUserStatusSuccess),
      filter(({ id }) => this.openUser()?.id === id),
      map(({ id }) => UsersStoreActions.loadUser({ id })),
    ),
  );

  updateUserStatusSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UsersStoreActions.updateUserStatusSuccess),
        tap(({ command }) =>
          this.snackBar.success(
            command.userStatusId === UserStatus.Inactive
              ? this.transloco.translate('users.deactivated')
              : this.transloco.translate('users.activated'),
          ),
        ),
      ),
    { dispatch: false },
  );

  updateUserStatusFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(UsersStoreActions.updateUserStatusFailure),
        tap(({ message }) => this.snackBar.error(message)),
      ),
    { dispatch: false },
  );
}
