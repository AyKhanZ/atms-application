import { createAction, props } from '@ngrx/store';
import { PaginatedResponse } from '../../core/models/paginated.model';
import {
  UserListFilter,
  UserListItemModel,
  UserModel,
} from '../../core/models/users/users.models';
import { UpdateUserStatusCommand } from '../../core/models/users/update-user-status.command';
import { RegisterUserCommand } from '../../core/models/users/register-user.command';

const key = '[users]';

// GET /users
export const loadUsers = createAction(`${key} Load Users`, props<{ filter: UserListFilter }>());
export const loadUsersSuccess = createAction(`${key} Load Users Success`, props<{ response: PaginatedResponse<UserListItemModel> }>());
export const loadUsersFailure = createAction(`${key} Load Users Failure`);
export const setFilter = createAction(`${key} Set Filter`, props<{ filter: Partial<UserListFilter> }>());

// POST /account/register
export const registerUser = createAction(`${key} Register User`, props<{ command: RegisterUserCommand }>());
export const registerUserSuccess = createAction(`${key} Register User Success`, props<{ item: UserModel }>());
export const registerUserFailure = createAction(`${key} Register User Failure`);

// GET /users/:id
export const loadUser = createAction(`${key} Load User`, props<{ id: string }>());
export const loadUserSuccess = createAction(`${key} Load User Success`, props<{ item: UserModel }>());
export const loadUserFailure = createAction(`${key} Load User Failure`);

// PATCH /users/status/:id
export const updateUserStatus = createAction(`${key} Update User Status`, props<{ id: string; command: UpdateUserStatusCommand }>());
export const updateUserStatusSuccess = createAction(`${key} Update User Status Success`, props<{ id: string; command: UpdateUserStatusCommand }>());
export const updateUserStatusFailure = createAction(`${key} Update User Status Failure`);

export const clearItem = createAction(`${key} Clear Item`);
export const clearItems = createAction(`${key} Clear Items`);
export const clearAll = createAction(`${key} Clear All`);
