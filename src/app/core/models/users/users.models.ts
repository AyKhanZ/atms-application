import { DictionaryModel } from '../dictionary.model';
import { PaginationRequest, createPaginationRequest } from '../paginated.model';

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

export interface UserListFilter extends PaginationRequest {
  search?: string;
  userStatusId?: number;
  createdFrom?: string;
  createdTo?: string;
}

export function createDefaultUserListFilter(): UserListFilter {
  return createPaginationRequest();
}
