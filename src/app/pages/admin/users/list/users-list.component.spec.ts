import { Component, model, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { EMPTY } from 'rxjs';
import { UserListItemModel } from '../../../../core/models/users/users.models';
import { DictionaryStoreSelectors } from '../../../../store/dictionary';
import { UserStoreSelectors } from '../../../../store/user';
import { UsersStoreSelectors } from '../../../../store/users';
import { UserRegisterDialogComponent } from '../components/user-register-dialog/user-register-dialog.component';
import { UsersListComponent } from './users-list.component';

import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
const user: UserListItemModel = {
  id: 'user-1',
  name: 'Ann',
  surname: 'Lee',
  email: 'ann@example.com',
  userStatus: { id: 1, code: 'Active', name: 'Active' },
  createdAt: '2026-09-01T00:00:00Z',
  avatarPath: '',
  position: 'Developer',
};

// the real dialog reads its own store slices; the list only binds to it
@Component({ selector: 'app-user-register-dialog', template: '' })
class RegisterDialogStub {
  readonly visible = model.required<boolean>();
  readonly saved = output<void>();
}

describe('UsersListComponent', () => {
  afterEach(() => TestBed.inject(MockStore).resetSelectors());

  async function render() {
    TestBed.configureTestingModule({
      imports: [UsersListComponent],
      providers: [
        ...translocoTestingProviders(),
        provideRouter([]),
        provideMockStore(),
        provideMockActions(() => EMPTY),
      ],
    }).overrideComponent(UsersListComponent, {
      remove: { imports: [UserRegisterDialogComponent] },
      add: { imports: [RegisterDialogStub] },
    });
    const store = TestBed.inject(MockStore);
    store.overrideSelector(UsersStoreSelectors.getItems, [user]);
    store.overrideSelector(UsersStoreSelectors.getTotalCount, 1);
    store.overrideSelector(UsersStoreSelectors.isLoading, false);
    store.overrideSelector(DictionaryStoreSelectors.getUserStatusesDictionaries, []);
    store.overrideSelector(DictionaryStoreSelectors.getUserStatusesDictionariesIsLoading, false);
    store.overrideSelector(UserStoreSelectors.getRoles, []);
    store.overrideSelector(UserStoreSelectors.getPermissions, []);
    const fixture = TestBed.createComponent(UsersListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the user name, its overlay makes the whole row open in a new tab too', async () => {
    const row = (await render()).querySelector('tr.clickable-row') as HTMLElement;

    expect(row.querySelector('a.user-name__link')?.getAttribute('href')).toBe('/users/user-1');
    expect(row.querySelector('a.user-name__link')?.textContent?.trim()).toBe('Ann Lee');
  });

  it('opens the user inside the app on a plain click, with this list to go back to', async () => {
    const element = await render();
    const router = TestBed.inject(Router);
    const follow = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    (element.querySelector('a.user-name__link') as HTMLAnchorElement).click();

    expect(router.url).toContain('page=1');
    expect(router.serializeUrl(follow.mock.lastCall![0] as never)).toBe('/users/user-1');
    expect(follow.mock.lastCall![1]).toEqual(
      expect.objectContaining({ state: { returnUrl: router.url } }),
    );
  });

  it('keeps the email a mail link, not a way into the user', async () => {
    const element = await render();
    const follow = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const email = element.querySelector('a.email-link') as HTMLAnchorElement;
    email.addEventListener('click', (event) => event.preventDefault());

    email.click();

    expect(email.getAttribute('href')).toBe('mailto:ann@example.com');
    expect(follow).not.toHaveBeenCalled();
  });
});
