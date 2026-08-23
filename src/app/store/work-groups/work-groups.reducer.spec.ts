import { WorkGroupModel } from '../../core/models/work-groups';
import { WorkGroupsStoreActions } from './index';
import { workGroupsReducer } from './work-groups.reducer';
import { initialWorkGroupsState } from './work-groups.state';

const milestone: WorkGroupModel = {
  id: 'milestone-1',
  title: 'Discovery',
  parentWorkGroupId: 'group-1',
  status: { id: 1, name: 'Planned', code: 'Planned' },
  ticketCount: 0,
  milestones: [],
};

const group: WorkGroupModel = {
  id: 'group-1',
  title: 'Delivery',
  parentWorkGroupId: null,
  status: { id: 1, name: 'Planned', code: 'Planned' },
  ticketCount: 0,
  milestones: [milestone],
};

describe('workGroupsReducer', () => {
  it('stores the groups loaded for the active project', () => {
    const loading = workGroupsReducer(
      initialWorkGroupsState,
      WorkGroupsStoreActions.loadWorkGroups({ projectId: 'project-1' }),
    );
    const loaded = workGroupsReducer(
      loading,
      WorkGroupsStoreActions.loadWorkGroupsSuccess({
        projectId: 'project-1',
        items: [group],
      }),
    );

    expect(loaded.items).toEqual([group]);
    expect(loaded.isLoading).toBe(false);
  });

  it('removes a deleted milestone from its group', () => {
    const state = {
      ...initialWorkGroupsState,
      projectId: 'project-1',
      items: [group],
      isSaving: true,
    };

    const result = workGroupsReducer(
      state,
      WorkGroupsStoreActions.deleteWorkGroupSuccess({
        projectId: 'project-1',
        workGroupId: 'milestone-1',
        kind: 'milestone',
      }),
    );

    expect(result.items[0].milestones).toEqual([]);
    expect(result.isSaving).toBe(false);
  });

  it('clears project-scoped state on reset', () => {
    const state = {
      ...initialWorkGroupsState,
      projectId: 'project-1',
      items: [group],
    };

    const result = workGroupsReducer(state, WorkGroupsStoreActions.resetWorkGroups());

    expect(result).toEqual(initialWorkGroupsState);
  });
});
