import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ConfirmationService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { ProjectPermissions } from '../../../../../core/enums/project-permissions.enum';
import { WorkGroupModel } from '../../../../../core/models/work-groups';
import { ProjectAccessService } from '../../../../../core/services/project-access.service';
import { Features } from '../../../../../store/features.enum';
import { initialWorkGroupsState } from '../../../../../store/work-groups/work-groups.state';
import { WorkGroupsStoreActions } from '../../../../../store/work-groups';
import {
  GroupsTabComponent,
  completedMilestoneCount,
  workGroupDeleteBlockReason,
} from './groups-tab.component';
import { WorkGroupExpansionStateService } from './work-group-expansion-state.service';

function workGroup(overrides: Partial<WorkGroupModel> = {}): WorkGroupModel {
  return {
    id: 'item-1',
    title: 'Delivery',
    parentWorkGroupId: null,
    status: { id: 1, name: 'Planned', code: 'Planned' },
    ticketCount: 0,
    milestones: [],
    ...overrides,
  };
}

describe('workGroupDeleteBlockReason', () => {
  it('allows deleting an empty group', () => {
    expect(workGroupDeleteBlockReason(workGroup(), 'group')).toBeNull();
  });

  it('blocks a group that contains milestones and tickets', () => {
    const item = workGroup({
      milestones: [
        workGroup({
          id: 'milestone-1',
          parentWorkGroupId: 'item-1',
          ticketCount: 2,
        }),
      ],
    });

    expect(workGroupDeleteBlockReason(item, 'group')).toContain('1 milestone and 2 tickets');
  });

  it('blocks a milestone that contains tickets', () => {
    const item = workGroup({
      title: 'Discovery',
      parentWorkGroupId: 'group-1',
      ticketCount: 1,
    });

    expect(workGroupDeleteBlockReason(item, 'milestone')).toContain('1 ticket');
  });
});

describe('completedMilestoneCount', () => {
  it('counts only milestones with the Done status', () => {
    const group = workGroup({
      milestones: [
        workGroup({ id: 'done', status: { id: 3, name: 'Done', code: 'Done' } }),
        workGroup({ id: 'active', status: { id: 2, name: 'Active', code: 'Active' } }),
        workGroup({ id: 'planned' }),
      ],
    });

    expect(completedMilestoneCount(group)).toBe(1);
  });
});

describe('GroupsTabComponent', () => {
  let fixture: ComponentFixture<GroupsTabComponent>;
  let store: MockStore;
  let actions$: Subject<unknown>;

  beforeEach(async () => {
    actions$ = new Subject<unknown>();

    await TestBed.configureTestingModule({
      imports: [GroupsTabComponent],
      providers: [
        ConfirmationService,
        WorkGroupExpansionStateService,
        {
          provide: ProjectAccessService,
          useValue: {
            getPermissions: () => of([ProjectPermissions.Group.Edit, ProjectPermissions.Group.Delete]),
            hasPermission: () => of(true),
            version: () => 0,
          },
        },
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            [Features.WorkGroups]: {
              ...initialWorkGroupsState,
              items: [workGroup()],
              projectId: 'project-1',
              loadError: "We couldn't refresh the plan. The information shown may be out of date.",
            },
          },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(GroupsTabComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
  });

  it('keeps existing groups visible and offers Try again after a refresh error', () => {
    const dispatch = vi.spyOn(store, 'dispatch');
    dispatch.mockClear();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.groups-refresh-error')?.textContent).toContain(
      "We couldn't refresh the plan. The information shown may be out of date.",
    );
    expect(element.querySelectorAll('.group-card')).toHaveLength(1);

    const retryButton = element.querySelector<HTMLButtonElement>('.groups-refresh-error button');
    retryButton?.click();

    expect(dispatch).toHaveBeenCalledWith(
      WorkGroupsStoreActions.loadWorkGroups({ projectId: 'project-1' }),
    );
  });

  it('shows a concise empty state without a duplicate heading or action', () => {
    store.setState({
      [Features.WorkGroups]: {
        ...initialWorkGroupsState,
        projectId: 'project-1',
      },
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const emptyState = element.querySelector('.groups-state--empty');

    expect(element.querySelector('.groups-toolbar h3')).toBeNull();
    expect(
      emptyState?.querySelector('.project-tab-empty-state__icon .pi-folder-open'),
    ).not.toBeNull();
    expect(emptyState?.querySelector('h3')?.textContent?.trim()).toBe('No groups in the plan yet');
    expect(emptyState?.querySelector('span')).toBeNull();
    expect(emptyState?.querySelector('button')).toBeNull();
    expect(element.querySelector('.groups-add-button')).not.toBeNull();
  });

  it('offers expand all and collapse all when the plan contains several groups', () => {
    const groups = Array.from({ length: 4 }, (_, index) =>
      workGroup({ id: `group-${index + 1}`, title: `Group ${index + 1}` }),
    );
    store.setState({
      [Features.WorkGroups]: {
        ...initialWorkGroupsState,
        items: groups,
        projectId: 'project-1',
      },
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.showExpansionControls()).toBe(true);

    fixture.componentInstance.toggleAllGroups();
    expect(fixture.componentInstance.allGroupsExpanded()).toBe(true);

    fixture.componentInstance.toggleAllGroups();
    expect(fixture.componentInstance.expandedGroupIds().size).toBe(0);
  });

  it('keeps the toolbar hidden until the initial plan request completes', () => {
    fixture.componentInstance.initialLoadComplete.set(false);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.groups-toolbar')
        ?.classList.contains('groups-toolbar--pending'),
    ).toBe(true);

    actions$.next(
      WorkGroupsStoreActions.loadWorkGroupsSuccess({
        projectId: 'project-1',
        items: [workGroup()],
      }),
    );
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.groups-toolbar')
        ?.classList.contains('groups-toolbar--pending'),
    ).toBe(false);
  });

  it('expands the parent after creating a milestone for the active project', () => {
    expect(fixture.componentInstance.isExpanded('item-1')).toBe(false);

    actions$.next(
      WorkGroupsStoreActions.createWorkGroupSuccess({
        projectId: 'project-2',
        id: 'other-milestone',
        kind: 'milestone',
        parentWorkGroupId: 'item-1',
      }),
    );
    expect(fixture.componentInstance.isExpanded('item-1')).toBe(false);

    actions$.next(
      WorkGroupsStoreActions.createWorkGroupSuccess({
        projectId: 'project-1',
        id: 'milestone-1',
        kind: 'milestone',
        parentWorkGroupId: 'item-1',
      }),
    );

    expect(fixture.componentInstance.isExpanded('item-1')).toBe(true);
  });
});
