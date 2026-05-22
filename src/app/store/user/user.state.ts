import { RoleModel } from '../../core/models/users/user.models';
import { MeModel } from '../../core/models/users/me.model';

export interface UserState {
  me: MeModel | null;
  roles: RoleModel[];
  permissions: string[];
  isLoading: boolean;
}

export const initialUserState: UserState = {
  me: null,
  roles: [],
  permissions: [],
  isLoading: false,
};
