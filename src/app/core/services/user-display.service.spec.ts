import { UserStatus } from '../enums/user-status.enum';
import { UserListItemModel } from '../models/users/users.models';
import { UserDisplayService } from './user-display.service';

describe('UserDisplayService statusSeverity', () => {
  const withStatus = (id: number) =>
    ({ userStatus: { id, name: '', code: '' } }) as unknown as UserListItemModel;

  it.each([
    [UserStatus.Active, 'success'],
    [UserStatus.Inactive, 'secondary'],
    [UserStatus.Locked, 'warn'],
  ])('colors status %i as %s', (status, severity) => {
    expect(new UserDisplayService().statusSeverity(withStatus(status))).toBe(severity);
  });
});
