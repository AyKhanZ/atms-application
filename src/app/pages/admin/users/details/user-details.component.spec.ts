import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { UserModel } from '../../../../core/models/users/users.models';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { UsersStoreSelectors } from '../../../../store/users';
import { UserDetailsComponent } from './user-details.component';

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

  const render = (value: UserModel | null) => {
    store.overrideSelector(UsersStoreSelectors.getItem, value);
    const fixture = TestBed.createComponent(UserDetailsComponent);
    fixture.detectChanges();
    return fixture;
  };

  const workRow = (fixture: ReturnType<typeof render>, label: string): HTMLElement | null => {
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('dl > div')];
    return (
      (rows.find((row) => row.querySelector('dt')?.textContent?.trim() === label) as HTMLElement) ??
      null
    );
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserDetailsComponent],
      providers: [
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: UsersStoreSelectors.getItem, value: null },
            { selector: UsersStoreSelectors.isLoading, value: false },
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
});
