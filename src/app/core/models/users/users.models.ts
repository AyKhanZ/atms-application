import { DictionaryModel } from '../dictionary.model';
import { SortDirectionEnum } from '../../enums/sort-direction.enum';
import { PaginatedFilter } from '../paginated.model';

export interface UserListItemModel {
  id: string;
  name: string;
  surname: string;
  email: string;
  userStatus: DictionaryModel;
  createdAt: string;
  avatarPath: string;
  position: string;
}

export interface UserModel extends UserListItemModel {
  phoneNumber: string;
  birthDate: string;
  roles: DictionaryModel[];
  gender: DictionaryModel;
  maritalStatus: DictionaryModel;
  lockoutEnd: string;
  hasCompletedSurvey: string;
  emailConfirmed: string;
}

export interface UserListResponse {
  items: UserListItemModel[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UserListFilter extends PaginatedFilter {
  search?: string;
  userStatusId?: number;
  createdFrom?: string;
  createdTo?: string;
}

export const defaultFilter: UserListFilter = {
  page: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortDirection: SortDirectionEnum.Desc,
};
