import { DictionaryModel } from '../dictionary.model';

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

export interface UserListFilter {
  name?: string;
  surname?: string;
  email?: string;
  userStatusId?: number;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: number;
}
