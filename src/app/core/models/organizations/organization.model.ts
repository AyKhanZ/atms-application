import { OrganizationListItemModel } from './organization-list-item.model';

export interface OrganizationUserModel {
  id: string;
  name: string;
  surname: string;
  email: string;
  avatarPath?: string | null;
}

export interface OrganizationModel extends OrganizationListItemModel {
  users: OrganizationUserModel[];
}
