import { createAction, props } from '@ngrx/store';
import { MeModel } from '../../core/models/users/me.model';
import { RoleModel } from '../../core/models/users/user.models';

const key = '[User]';

export const loadUserData = createAction(`${key} Load User Data`);
export const loadUserDataSuccess = createAction(`${key} Load User Data Success`, props<{ me: MeModel; roles: RoleModel[]; permissions: string[] }>());
export const loadUserDataFailure = createAction(
  `${key} Load User Data Failure`,
  props<{ isServerUnavailable: boolean }>(),
);

export const clearAll = createAction(`${key} Clear All`);
