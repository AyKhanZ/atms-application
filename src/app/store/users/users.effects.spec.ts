import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ReplaySubject } from 'rxjs';
import { translocoTestingProviders } from '../../core/testing/transloco-testing';
import { UserStatus } from '../../core/enums/user-status.enum';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { UsersService } from '../../core/services/users.service';
import { UsersEffects } from './users.effects';
import * as UsersStoreActions from './users.actions';
import * as UsersStoreSelectors from './users.selectors';

describe('UsersEffects', () => {
  let actions$: ReplaySubject<unknown>;
  let store: MockStore;

  const effects = (openUserId: string | null) => {
    store.overrideSelector(
      UsersStoreSelectors.getItem,
      openUserId ? ({ id: openUserId } as never) : null,
    );
    store.refreshState();
    return TestBed.inject(UsersEffects);
  };

  const statusChanged = (id: string) =>
    UsersStoreActions.updateUserStatusSuccess({
      id,
      command: { userStatusId: UserStatus.Inactive },
    });

  // overridden selectors are global and would leak into other spec files
  afterEach(() => store.resetSelectors());

  beforeEach(() => {
    actions$ = new ReplaySubject<unknown>(1);
    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        UsersEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: UsersService, useValue: {} },
        { provide: SnackBarService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('reads the open user again after its status changed, for the translated name', () => {
    const emitted = vi.fn();
    effects('user-id').reloadAfterStatusChange$.subscribe(emitted);

    actions$.next(statusChanged('user-id'));

    expect(emitted).toHaveBeenCalledWith(UsersStoreActions.loadUser({ id: 'user-id' }));
  });

  it('does not load anyone when the changed user is not the open one', () => {
    const emitted = vi.fn();
    effects('someone-else').reloadAfterStatusChange$.subscribe(emitted);

    actions$.next(statusChanged('user-id'));

    expect(emitted).not.toHaveBeenCalled();
  });
});
