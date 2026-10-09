import { Injectable } from '@angular/core';
import { UserStatus } from '../enums/user-status.enum';
import { UserListItemModel, UserModel } from '../models/users/users.models';

type UserDisplayModel = Pick<UserListItemModel, 'name' | 'surname'> & {
  userStatus?: { name?: string | null } | null;
};

@Injectable({ providedIn: 'root' })
export class UserDisplayService {
  fullName(user: UserDisplayModel | null | undefined): string {
    if (!user) {
      return '';
    }

    return [user.name, user.surname].filter(Boolean).join(' ');
  }

  initials(user: UserDisplayModel | null | undefined): string {
    const name = user?.name?.trim()?.[0] ?? '';
    const surname = user?.surname?.trim()?.[0] ?? '';

    return `${name}${surname}`.toUpperCase() || 'U';
  }

  status(user: UserModel | UserListItemModel): string {
    return user.userStatus?.name ?? 'Unknown';
  }

  statusSeverity(user: UserModel | UserListItemModel): 'success' | 'secondary' | 'warn' {
    switch (user.userStatus?.id) {
      case UserStatus.Active:
        return 'success';
      case UserStatus.Locked:
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
