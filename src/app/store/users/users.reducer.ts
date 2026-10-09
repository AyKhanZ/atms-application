import { type Action, createReducer, on } from '@ngrx/store';
import { createDefaultUserListFilter } from '../../core/models/users/users.models';
import * as UsersStoreActions from './users.actions';
import { type UsersState, initialUsersState } from './users.state';

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
    UsersStoreActions.registerUser,
    (state): UsersState => ({
      ...state,
      isSubmitted: true,
    }),
  ),

  on(
    UsersStoreActions.registerUserSuccess,
    (state): UsersState => ({
      ...state,
      isSubmitted: false,
    }),
  ),

  on(
    UsersStoreActions.registerUserFailure,
    (state): UsersState => ({
      ...state,
      isSubmitted: false,
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
      item:
        state.item?.id === id
          ? { ...state.item, userStatus: { ...state.item.userStatus, id: command.userStatusId } }
          : state.item,
      items: state.items.map((user) =>
        user.id === id
          ? { ...user, userStatus: { ...user.userStatus, id: command.userStatusId } }
          : user,
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
      filter: createDefaultUserListFilter(),
      isLoading: false,
    }),
  ),

  on(UsersStoreActions.clearAll, (): UsersState => initialUsersState),
);

export function usersReducer(state: UsersState | undefined, action: Action): UsersState {
  return reducer(state, action);
}
