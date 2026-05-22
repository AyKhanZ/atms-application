import { createAction, props } from '@ngrx/store';
import { AccessModel } from '../../core/models/auth/auth.models';
import { LoginCommand } from '../../core/models/auth/login.command';

const key = '[Auth]';

export const login = createAction(`${key} Login`, props<{ command: LoginCommand }>());
export const loginSuccess = createAction(
  `${key} Login Success`,
  props<{ accessModel: AccessModel }>(),
);
export const loginFailure = createAction(`${key} Login Failure`, props<{ errors: string[] }>());

export const refreshToken = createAction(`${key} Refresh Token`);

export const logout = createAction(`${key} Logout`);

export const restoreSession = createAction(
  `${key} Restore Session`,
  props<{ accessModel: AccessModel }>(),
);

export const refreshTokenSuccess = createAction(
  `${key} Refresh Token Success`,
  props<{ accessModel: AccessModel }>(),
);
