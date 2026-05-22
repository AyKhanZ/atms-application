import { type Action, createReducer, on } from '@ngrx/store';
import * as UsersStoreActions from './users.actions';
import { type UsersState, initialUsersState, defaultFilter } from './users.state';

const reducer = createReducer<UsersState>(
  initialUsersState,

  on(
    UsersStoreActions.loadUsers,
    (state, { filter }): UsersState => ({
      ...state,
      isLoading: true,
      filter: { ...state.filter, ...filter },
    }),
  ),

  on(
    UsersStoreActions.loadUsersSuccess,
    (state, { response }): UsersState => ({
      ...state,
      isLoading: false,
      items: response.items,
      totalCount: response.totalCount,
      totalPages: response.totalPages,
      hasNext: response.hasNext,
      hasPrevious: response.hasPrevious,
    }),
  ),

  on(
    UsersStoreActions.loadUsersFailure,
    (state): UsersState => ({
      ...state,
      isLoading: false,
    }),
  ),

  on(
    UsersStoreActions.loadUser,
    (state): UsersState => ({
      ...state,
      isLoading: true,
    }),
  ),

  on(
    UsersStoreActions.loadUserSuccess,
    (state, { item }): UsersState => ({
      ...state,
      isLoading: false,
      item,
    }),
  ),

  on(
    UsersStoreActions.loadUserFailure,
    (state): UsersState => ({
      ...state,
      isLoading: false,
    }),
  ),

  on(
    UsersStoreActions.updateUserStatus,
    (state): UsersState => ({
      ...state,
      isSubmitted: true,
    }),
  ),

  on(
    UsersStoreActions.updateUserStatusSuccess,
    (state, { id, command }): UsersState => ({
      ...state,
      isSubmitted: false,
      items: state.items.map((u) =>
        u.id === id ? { ...u, userStatus: { ...u.userStatus, id: command.userStatusId } } : u,
      ),
    }),
  ),

  on(
    UsersStoreActions.updateUserStatusFailure,
    (state): UsersState => ({
      ...state,
      isSubmitted: false,
    }),
  ),

  on(
    UsersStoreActions.setFilter,
    (state, { filter }): UsersState => ({
      ...state,
      filter: { ...state.filter, ...filter },
    }),
  ),

  on(
    UsersStoreActions.clearItem,
    (state): UsersState => ({
      ...state,
      item: null,
      isLoading: false,
      isSubmitted: false,
    }),
  ),

  on(
    UsersStoreActions.clearItems,
    (state): UsersState => ({
      ...state,
      items: [],
      totalCount: 0,
      totalPages: 0,
      hasNext: false,
      hasPrevious: false,
      filter: defaultFilter,
      isLoading: false,
    }),
  ),

  on(UsersStoreActions.clearAll, (): UsersState => initialUsersState),
);

export function usersReducer(state: UsersState | undefined, action: Action): UsersState {
  return reducer(state, action);
}
