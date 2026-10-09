import { UserStatus } from '../../core/enums/user-status.enum';
import { UserModel } from '../../core/models/users/users.models';
import * as UsersStoreActions from './users.actions';
import { usersReducer } from './users.reducer';
import { initialUsersState } from './users.state';

const user = (): UserModel => ({
  id: 'user-id',
  name: 'Ayxan',
  surname: 'Zeynalov',
  email: 'ayxan@client.com',
  phoneNumber: '+994501234567',
  birthDate: '1990-05-20',
  roles: [],
  gender: { id: 1, name: 'Male', code: 'Male' },
  maritalStatus: { id: 1, name: 'Single', code: 'Single' },
  userStatus: { id: UserStatus.Active, name: 'Active', code: 'Active' },
  lockoutEnd: '',
  hasCompletedOnboarding: true,
  emailConfirmed: true,
  createdAt: '2026-07-24T21:33:00Z',
  avatarPath: '',
  position: 'Procurement lead',
});

describe('usersReducer', () => {
  // the translated name comes with the reload, see UsersEffects.reloadAfterStatusChange$
  it('switches the open user to the new status id', () => {
    const next = usersReducer(
      { ...initialUsersState, item: user(), isSubmitted: true },
      UsersStoreActions.updateUserStatusSuccess({
        id: 'user-id',
        command: { userStatusId: UserStatus.Inactive },
      }),
    );

    expect(next.item?.userStatus.id).toBe(UserStatus.Inactive);
    expect(next.isSubmitted).toBe(false);
  });
});
