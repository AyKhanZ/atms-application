import { type Action, createReducer, on } from '@ngrx/store';
import * as UserStoreActions from './user.actions';
import { type UserState, initialUserState } from './user.state';

const reducer = createReducer<UserState>(
  initialUserState,

  on(
    UserStoreActions.loadUserData,
    (state): UserState => ({
      ...state,
      isLoading: true,
    }),
  ),

  on(
    UserStoreActions.loadUserDataSuccess,
    (state, { me, roles, permissions }): UserState => ({
      ...state,
      isLoading: false,
      me,
      roles,
      permissions,
    }),
  ),

  on(
    UserStoreActions.loadUserDataFailure,
    (state): UserState => ({
      ...state,
      isLoading: false,
    }),
  ),

  on(UserStoreActions.clearAll, (): UserState => initialUserState),
);

export function userReducer(state: UserState | undefined, action: Action): UserState {
  return reducer(state, action);
}
