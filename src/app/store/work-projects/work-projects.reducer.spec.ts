import { SortDirectionEnum } from '../../core/enums/sort-direction.enum';
import { WorkProjectsStoreActions } from './index';
import { workProjectsReducer } from './work-projects.reducer';
import { initialWorkProjectsState } from './work-projects.state';

describe('workProjectsReducer', () => {
  it('stores a loaded page and stops loading', () => {
    const loading = workProjectsReducer(initialWorkProjectsState, WorkProjectsStoreActions.loadProjects({
      filter: { page: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: SortDirectionEnum.Desc },
    }));
    const loaded = workProjectsReducer(loading, WorkProjectsStoreActions.loadProjectsSuccess({
      response: { items: [], totalCount: 4, page: 1, pageSize: 10, totalPages: 1, hasNext: false, hasPrevious: false },
    }));

    expect(loaded.isLoading).toBe(false);
    expect(loaded.totalCount).toBe(4);
  });

  it('removes a deleted project from the current page', () => {
    const state = {
      ...initialWorkProjectsState,
      totalCount: 1,
      items: [{
        id: 'project-id',
        code: '1',
        title: 'Portal',
        projectType: { id: 1, name: 'Internal', code: 'Internal' },
        projectKind: { id: 1, name: 'Software', code: 'Software' },
        projectStatus: { id: 1, name: 'Active', code: 'Active' },
        createdAt: '2026-08-05T00:00:00Z',
      }],
    };

    const result = workProjectsReducer(state, WorkProjectsStoreActions.deleteProjectSuccess({ id: 'project-id' }));

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
