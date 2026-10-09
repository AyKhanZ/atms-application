import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ConfirmationService } from 'primeng/api';
import { Roles } from '../../../../core/enums/roles.enum';
import { UserStatus } from '../../../../core/enums/user-status.enum';
import { MeModel } from '../../../../core/models/users/me.model';
import { UserModel } from '../../../../core/models/users/users.models';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { UserStoreSelectors } from '../../../../store/user';
import { UsersStoreActions, UsersStoreSelectors } from '../../../../store/users';
import { UserDetailsComponent } from './user-details.component';

import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
describe('UserDetailsComponent', () => {
  let store: MockStore;

  const user = (overrides: Partial<UserModel> = {}): UserModel => ({
    id: 'user-id',
    name: 'Ayxan',
    surname: 'Zeynalov',
    email: 'ayxan@client.com',
    phoneNumber: '+994501234567',
    birthDate: '1990-05-20',
    roles: [{ id: 1, name: 'Client', code: 'Client' }],
    gender: { id: 1, name: 'Male', code: 'Male' },
    maritalStatus: { id: 1, name: 'Single', code: 'Single' },
    userStatus: { id: 1, name: 'Active', code: 'Active' },
    lockoutEnd: '',
    hasCompletedOnboarding: true,
    emailConfirmed: true,
    createdAt: '2026-07-24T21:33:00Z',
    avatarPath: '',
    position: 'Procurement lead',
    ...overrides,
  });

  const me = (id = 'me-id'): MeModel => ({
    id,
    name: 'Admin',
    surname: 'User',
    language: 'en',
    avatarPath: '',
  });

  const render = (value: UserModel | null) => {
    store.overrideSelector(UsersStoreSelectors.getItem, value);
    store.refreshState();
    const fixture = TestBed.createComponent(UserDetailsComponent);
    fixture.detectChanges();
    return fixture;
  };

  const statusButton = (fixture: ComponentFixture<UserDetailsComponent>, label?: string) => {
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    return (
      buttons.find((button) => {
        const text = button.textContent?.trim() ?? '';
        return label ? text === label : text === 'Deactivate' || text === 'Activate';
      }) ?? null
    );
  };

  const workRow = (fixture: ReturnType<typeof render>, label: string): HTMLElement | null => {
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('dl > div')];
    return (
      (rows.find((row) => row.querySelector('dt')?.textContent?.trim() === label) as HTMLElement) ??
      null
    );
  };

  // overridden selectors are global and would leak into other spec files
  afterEach(() => store.resetSelectors());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailsComponent],
      providers: [...translocoTestingProviders(), 
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: UsersStoreSelectors.getItem, value: null },
            { selector: UsersStoreSelectors.isLoading, value: false },
            { selector: UsersStoreSelectors.isSubmitted, value: false },
            { selector: UserStoreSelectors.getMe, value: me() },
            {
              selector: UserStoreSelectors.getRoles,
              value: [{ id: 'super-admin-role', name: 'Super admin', code: Roles.SuperAdmin }],
            },
          ],
        }),
        { provide: BreadcrumbOverrideService, useValue: { set: vi.fn(), clear: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', 'user-id']]) } },
        },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('shows the organization of a client as a link to its page', () => {
    const fixture = render(
      user({
        organization: {
          id: 'org-id',
          title: 'Apple',
          voen: '8056783562',
          logoPath: 'organizations/apple.png',
        },
      }),
    );

    const row = workRow(fixture, 'Organization');
    const link = row?.querySelector<HTMLAnchorElement>('a.organization-link');
    expect(link?.getAttribute('href')).toBe('/organizations/org-id');
    expect(link?.textContent?.trim()).toBe('Apple');
    expect(link?.querySelector('app-organization-logo img')?.getAttribute('src')).toContain(
      'organizations/apple.png',
    );
  });

  it.each([undefined, null])(
    'hides the organization row when it is %j (employees)',
    (organization) => {
      const fixture = render(user({ organization }));

      expect(workRow(fixture, 'Organization')).toBeNull();
      expect(workRow(fixture, 'Position')?.querySelector('dd')?.textContent?.trim()).toBe(
        'Procurement lead',
      );
    },
  );

  it('shows Deactivate for an active user and Activate for an inactive one', () => {
    const active = render(user());
    expect(statusButton(active, 'Deactivate')).toBeTruthy();

    store.overrideSelector(
      UsersStoreSelectors.getItem,
      user({ userStatus: { id: UserStatus.Inactive, name: 'Inactive', code: 'Inactive' } }),
    );
    store.refreshState();
    active.detectChanges();
    expect(statusButton(active, 'Activate')).toBeTruthy();
    expect(statusButton(active, 'Deactivate')).toBeNull();
  });

  it.each([['locked', { id: UserStatus.Locked, name: 'Locked', code: 'Locked' }]])(
    'hides the status button when the user is %s',
    (_label, userStatus) => {
      const fixture = render(user({ userStatus }));
      expect(statusButton(fixture)).toBeNull();
    },
  );

  it('hides the status button on your own page', () => {
    store.overrideSelector(UserStoreSelectors.getMe, me('user-id'));
    store.refreshState();
    const fixture = render(user());
    expect(statusButton(fixture)).toBeNull();
  });

  it('hides the status button on a super administrator page', () => {
    const fixture = render(
      user({ roles: [{ id: 1, name: 'Super admin', code: Roles.SuperAdmin }] }),
    );
    expect(statusButton(fixture)).toBeNull();
  });

  it('hides the status button for anyone but the super admin', () => {
    store.overrideSelector(UserStoreSelectors.getRoles, [
      { id: 'employee-role', name: 'Employee', code: 'Employee' },
    ]);
    store.refreshState();
    const fixture = render(user());
    expect(statusButton(fixture)).toBeNull();
  });

  it('deactivates only after confirmation', () => {
    const confirm = vi.spyOn(ConfirmationService.prototype, 'confirm').mockImplementation(function (
      this: ConfirmationService,
    ) {
      return this;
    });
    const fixture = render(user());
    const dispatch = vi.spyOn(store, 'dispatch');

    statusButton(fixture, 'Deactivate')?.click();

    const confirmation = confirm.mock.calls.at(-1)?.[0];
    expect(confirmation?.message).toContain("won't be able to sign in");
    expect(confirmation?.message).toContain('25 minutes');
    confirmation?.accept?.();
    expect(dispatch).toHaveBeenCalledWith(
      UsersStoreActions.updateUserStatus({
        id: 'user-id',
        command: { userStatusId: UserStatus.Inactive },
      }),
    );
    confirm.mockRestore();
  });

  it('activates only after confirmation', () => {
    const confirm = vi.spyOn(ConfirmationService.prototype, 'confirm').mockImplementation(function (
      this: ConfirmationService,
    ) {
      return this;
    });
    const fixture = render(
      user({ userStatus: { id: UserStatus.Inactive, name: 'Inactive', code: 'Inactive' } }),
    );
    const dispatch = vi.spyOn(store, 'dispatch');

    statusButton(fixture, 'Activate')?.click();

    confirm.mock.calls.at(-1)?.[0]?.accept?.();
    expect(dispatch).toHaveBeenCalledWith(
      UsersStoreActions.updateUserStatus({
        id: 'user-id',
        command: { userStatusId: UserStatus.Active },
      }),
    );
    confirm.mockRestore();
  });
});
