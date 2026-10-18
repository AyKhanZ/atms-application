import { Component, input, model, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ConfirmationService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { Roles } from '../../../../core/enums/roles.enum';
import { OrganizationListItemModel } from '../../../../core/models/organizations/organizations.models';
import { OrganizationsStoreSelectors } from '../../../../store/organizations';
import { UserStoreSelectors } from '../../../../store/user';
import { OrganizationCreateDialogComponent } from '../components/organization-create-dialog/organization-create-dialog.component';
import { ListComponent } from './list.component';

import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
const organization: OrganizationListItemModel = {
  id: 'org-1',
  title: 'Apple',
  voen: '8056783562',
  logoPath: null,
  createdAt: '2026-09-01T00:00:00Z',
};

// the real dialog reads its own store slices; the list only binds to it
@Component({ selector: 'app-organization-create-dialog', template: '' })
class CreateDialogStub {
  readonly visible = model.required<boolean>();
  readonly organization = input<OrganizationListItemModel | null>(null);
  readonly saved = output<void>();
}

describe('Organizations ListComponent', () => {
  afterEach(() => TestBed.inject(MockStore).resetSelectors());

  async function render(superAdmin: boolean) {
    TestBed.configureTestingModule({
      imports: [ListComponent],
      providers: [
        ...translocoTestingProviders(),
        provideRouter([]),
        provideMockStore(),
        provideMockActions(() => EMPTY),
      ],
    }).overrideComponent(ListComponent, {
      remove: { imports: [OrganizationCreateDialogComponent] },
      add: { imports: [CreateDialogStub] },
    });
    const store = TestBed.inject(MockStore);
    store.overrideSelector(OrganizationsStoreSelectors.getItems, [organization]);
    store.overrideSelector(OrganizationsStoreSelectors.getTotalCount, 1);
    store.overrideSelector(OrganizationsStoreSelectors.isLoading, false);
    store.overrideSelector(
      UserStoreSelectors.getRoles,
      superAdmin ? [{ id: 'role-1', code: Roles.SuperAdmin, name: 'Super admin' }] : [],
    );
    store.overrideSelector(UserStoreSelectors.getPermissions, []);
    const fixture = TestBed.createComponent(ListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('links the organization title, its overlay makes the whole row open in a new tab too', async () => {
    const row = (await render(false)).element.querySelector('tr.clickable-row') as HTMLElement;

    expect(row.querySelector('a.organization-title__link')?.getAttribute('href')).toBe(
      '/organizations/org-1',
    );
    expect(row.querySelectorAll('a')).toHaveLength(1);
  });

  it('opens the organization inside the app on a plain click, with this list to go back to', async () => {
    const { element } = await render(false);
    const router = TestBed.inject(Router);
    const follow = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    (element.querySelector('a.organization-title__link') as HTMLAnchorElement).click();

    expect(router.url).toContain('page=1');
    expect(router.serializeUrl(follow.mock.lastCall![0] as never)).toBe('/organizations/org-1');
    expect(follow.mock.lastCall![1]).toEqual(
      expect.objectContaining({ state: { returnUrl: router.url } }),
    );
  });

  it('keeps Edit and Delete as their own buttons, not a way into the organization', async () => {
    const { fixture, element } = await render(true);
    const follow = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const component = fixture.componentInstance;
    const confirm = vi
      .spyOn(fixture.debugElement.injector.get(ConfirmationService), 'confirm')
      .mockReturnThis();

    const [edit, remove] = element.querySelectorAll<HTMLButtonElement>('.actions-cell button');
    edit.click();
    remove.click();

    expect(component.selectedOrganization()).toBe(organization);
    expect(component.createDialogVisible()).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
    expect(follow).not.toHaveBeenCalled();
  });
});
