import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { Roles } from '../../../core/enums/roles.enum';
import { WorkProjectItemModel } from '../../../core/models/work-projects';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { UserStoreSelectors } from '../../../store/user';
import { WorkProjectsStoreSelectors } from '../../../store/work-projects';
import { ProjectListComponent } from './list.component';

import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
const project: WorkProjectItemModel = {
  id: 'project-1',
  code: '12',
  title: 'Payment Gateway Integration',
  organization: null,
  projectType: { id: 1, code: 'Internal', name: 'Internal' },
  projectKind: { id: 1, code: 'Product', name: 'Product' },
  projectStatus: { id: 1, code: 'Active', name: 'Active' },
  startDate: null,
  endDate: null,
  createdAt: '2026-09-01T00:00:00Z',
};

describe('ProjectListComponent', () => {
  afterEach(() => TestBed.inject(MockStore).resetSelectors());

  function render(superAdmin: boolean) {
    TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [
        ...translocoTestingProviders(),
        provideRouter([]),
        provideMockStore(),
        {
          provide: DictionaryService,
          useValue: {
            getProjectTypeDictionaries: () => of([]),
            getProjectKindDictionaries: () => of([]),
            getProjectStatusDictionaries: () => of([]),
          },
        },
      ],
    });
    const store = TestBed.inject(MockStore);
    store.overrideSelector(WorkProjectsStoreSelectors.getItems, [project]);
    store.overrideSelector(WorkProjectsStoreSelectors.getTotalCount, 1);
    store.overrideSelector(WorkProjectsStoreSelectors.isLoading, false);
    store.overrideSelector(
      UserStoreSelectors.getRoles,
      superAdmin ? [{ id: 'role-1', code: Roles.SuperAdmin, name: 'Super admin' }] : [],
    );
    const fixture = TestBed.createComponent(ProjectListComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('links the project title, its overlay makes the whole row open in a new tab too', () => {
    const row = render(false).querySelector('tr.clickable-row') as HTMLElement;

    expect(row.querySelector('a.project-title__link')?.getAttribute('href')).toBe(
      '/projects/project-1',
    );
    expect(row.querySelectorAll('a')).toHaveLength(1);
  });

  it('keeps the row actions as their own buttons, not a way into the project', () => {
    const element = render(true);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const follow = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    (element.querySelector('.actions-cell button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenLastCalledWith(['project-1', 'edit'], expect.anything());
    expect(follow).not.toHaveBeenCalled();
  });
});
