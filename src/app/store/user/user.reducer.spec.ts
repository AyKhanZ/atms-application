import { MeModel } from '../../core/models/users/me.model';
import * as UserStoreActions from './user.actions';
import { userReducer } from './user.reducer';
import { initialUserState, UserState } from './user.state';

const me: MeModel = {
  id: 'u1',
  name: 'Leyla',
  surname: 'Mammadova',
  language: 'EN',
  avatarPath: 'users/old.png',
};

describe('userReducer', () => {
  // Settings saves the profile; the top bar reads `me` and must change without a reload.
  it('updates name, surname, avatar and language of me after a profile save', () => {
    const state: UserState = { ...initialUserState, me };

    const next = userReducer(
      state,
      UserStoreActions.updateMeFromProfile({
        name: 'Aysel',
        surname: 'Aliyeva',
        avatarPath: 'users/new.png',
        language: 'AZ',
      }),
    );

    expect(next.me).toEqual({
      id: 'u1',
      name: 'Aysel',
      surname: 'Aliyeva',
      language: 'AZ',
      avatarPath: 'users/new.png',
    });
  });

  it('does not invent a user when me is not loaded', () => {
    const next = userReducer(
      initialUserState,
      UserStoreActions.updateMeFromProfile({
        name: 'Aysel',
        surname: 'Aliyeva',
        avatarPath: 'users/new.png',
        language: 'AZ',
      }),
    );

    expect(next.me).toBeNull();
  });
});
