import {
  defaultFilter,
  UserListFilter,
  UserListItemModel,
  UserModel,
} from '../../core/models/users/users.models';

export interface UsersState {
  items: UserListItemModel[];
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;

  item: UserModel | null;

  filter: UserListFilter;

  isLoading: boolean;
  isSubmitted: boolean;
}

export const initialUsersState: UsersState = {
  items: [],
  totalCount: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,

  item: null,

  filter: defaultFilter,

  isLoading: false,
  isSubmitted: false,
};
