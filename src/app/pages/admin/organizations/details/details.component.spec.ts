import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { EMPTY } from 'rxjs';
import { OrganizationModel } from '../../../../core/models/organizations/organizations.models';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { OrganizationsStoreSelectors } from '../../../../store/organizations';
import { UserStoreSelectors } from '../../../../store/user';
import { DetailsComponent } from './details.component';

import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
describe('Organization DetailsComponent', () => {
  let store: MockStore;

  const organization = (users: OrganizationModel['users']): OrganizationModel => ({
    id: 'org-id',
    title: 'Apple',
    voen: '8056783562',
    logoPath: null,
    createdAt: '2026-07-24T21:33:00Z',
    users,
  });

  const render = (value: OrganizationModel | null) => {
    store.overrideSelector(OrganizationsStoreSelectors.getItem, value);
    const fixture = TestBed.createComponent(DetailsComponent);
    fixture.detectChanges();
    return fixture;
  };

  const cells = (fixture: ReturnType<typeof render>, column: number): string[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.employees-table tbody tr')].map(
      (row) => row.querySelectorAll('td')[column].textContent?.trim() ?? '',
    );

  const names = (fixture: ReturnType<typeof render>): string[] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('.employee-cell .employee-name')].map(
      (name) => name.textContent?.trim() ?? '',
    );

  // overridden selectors are global and would leak into other spec files
  afterEach(() => store.resetSelectors());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsComponent],
      providers: [...translocoTestingProviders(), 
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: OrganizationsStoreSelectors.getItem, value: null },
            { selector: OrganizationsStoreSelectors.isLoading, value: false },
            { selector: OrganizationsStoreSelectors.isSubmitted, value: false },
            { selector: UserStoreSelectors.getRoles, value: [] },
            { selector: UserStoreSelectors.getPermissions, value: [] },
          ],
        }),
        provideMockActions(() => EMPTY),
        { provide: BreadcrumbOverrideService, useValue: { set: vi.fn(), clear: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', 'org-id']]) } },
        },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('lists employees in a table with their name, email and position', () => {
    const fixture = render(
      organization([
        {
          id: 'u1',
          name: 'Ayxan',
          surname: 'Zeynalov',
          email: 'ayxan@client.com',
          position: 'Procurement lead',
        },
        { id: 'u2', name: 'Diana', surname: 'Zeynalova', email: 'diana@client.com' },
      ]),
    );

    expect(names(fixture)).toEqual(['Ayxan Zeynalov', 'Diana Zeynalova']);
    expect(cells(fixture, 1)).toEqual(['ayxan@client.com', 'diana@client.com']);
    // No invented placeholder: an unknown position is a dash, like everywhere else on the page.
    expect(cells(fixture, 2)).toEqual(['Procurement lead', '-']);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('No position yet');
  });

  it('shows the empty state when the organization has no employees', () => {
    const fixture = render(organization([]));

    expect((fixture.nativeElement as HTMLElement).querySelector('.employees-table')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('.empty-employees')?.textContent).toContain(
      'No employees linked yet.',
    );
  });

  it('shows how many employees there are', () => {
    const fixture = render(
      organization([{ id: 'u1', name: 'Ayxan', surname: 'Zeynalov', email: 'a@client.com' }]),
    );

    expect((fixture.nativeElement as HTMLElement).querySelector('p-tag')?.textContent).toContain(
      '1 employee',
    );
  });
});
