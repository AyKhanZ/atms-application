import { type Action, createReducer, on } from '@ngrx/store';
import * as AuthStoreActions from './auth.actions';
import { type AuthState, initialAuthState } from './auth.state';

const reducer = createReducer<AuthState>(
  initialAuthState,

  on(
    AuthStoreActions.login,
    (state): AuthState => ({
      ...state,
      isLoading: true,
    }),
  ),

  on(
    AuthStoreActions.loginSuccess,
    (state, { accessModel }): AuthState => ({
      ...state,
      isLoading: false,
      accessModel,
    }),
  ),

  on(
    AuthStoreActions.loginFailure,
    (state): AuthState => ({
      ...state,
      isLoading: false,
    }),
  ),

  on(
    AuthStoreActions.restoreSession,
    (state, { accessModel }): AuthState => ({
      ...state,
      accessModel,
    }),
  ),

  on(
    AuthStoreActions.refreshTokenSuccess,
    (state, { accessModel }): AuthState => ({
      ...state,
      accessModel,
    }),
  ),

  on(AuthStoreActions.logout, (): AuthState => initialAuthState),
);

export function authReducer(state: AuthState | undefined, action: Action): AuthState {
  return reducer(state, action);
}
