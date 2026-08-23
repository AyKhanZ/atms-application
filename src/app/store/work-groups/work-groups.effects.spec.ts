import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject, throwError } from 'rxjs';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { WorkGroupsService } from '../../core/services/work-groups.service';
import { WorkGroupsEffects } from './work-groups.effects';
import * as WorkGroupsStoreActions from './work-groups.actions';

describe('WorkGroupsEffects', () => {
  let actions$: Subject<unknown>;
  let effects: WorkGroupsEffects;
  let snackBar: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let service: {
    getWorkGroups: ReturnType<typeof vi.fn>;
    createWorkGroup: ReturnType<typeof vi.fn>;
    updateWorkGroup: ReturnType<typeof vi.fn>;
    deleteWorkGroup: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    actions$ = new Subject<unknown>();
    service = {
      getWorkGroups: vi.fn(),
      createWorkGroup: vi.fn(),
      updateWorkGroup: vi.fn(),
      deleteWorkGroup: vi.fn(),
    };
    snackBar = { success: vi.fn(), error: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        WorkGroupsEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: WorkGroupsService, useValue: service },
        {
          provide: SnackBarService,
          useValue: snackBar,
        },
      ],
    });

    effects = TestBed.inject(WorkGroupsEffects);
  });

  it('uses the Plan context when the tab cannot be refreshed', () => {
    const emittedAction = vi.fn();
    service.getWorkGroups.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    const subscription = effects.load$.subscribe(emittedAction);
    actions$.next(WorkGroupsStoreActions.loadWorkGroups({ projectId: 'project-1' }));

    expect(emittedAction).toHaveBeenCalledWith(
      WorkGroupsStoreActions.loadWorkGroupsFailure({
        projectId: 'project-1',
        error: "We couldn't refresh the plan. The information shown may be out of date.",
      }),
    );
    subscription.unsubscribe();
  });

  it('explains a duplicate milestone name in user language', () => {
    const emittedAction = vi.fn();
    service.createWorkGroup.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              errors: [
                {
                  field: 'Title',
                  error:
                    'This group already has a milestone with this name. Choose a different name.',
                },
              ],
            },
          }),
      ),
    );

    const subscription = effects.create$.subscribe(emittedAction);
    actions$.next(
      WorkGroupsStoreActions.createWorkGroup({
        projectId: 'project-1',
        kind: 'milestone',
        command: { title: 'Discovery', parentWorkGroupId: 'group-1' },
      }),
    );

    expect(emittedAction).toHaveBeenCalledWith(
      WorkGroupsStoreActions.createWorkGroupFailure({
        projectId: 'project-1',
        kind: 'milestone',
        error: 'This group already has a milestone with this name. Choose a different name.',
      }),
    );
    subscription.unsubscribe();
  });

  it('explains why a non-empty group cannot be deleted', () => {
    const emittedAction = vi.fn();
    service.deleteWorkGroup.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 })),
    );

    const subscription = effects.delete$.subscribe(emittedAction);
    actions$.next(
      WorkGroupsStoreActions.deleteWorkGroup({
        projectId: 'project-1',
        workGroupId: 'group-1',
        kind: 'group',
      }),
    );

    expect(emittedAction).toHaveBeenCalledWith(
      WorkGroupsStoreActions.deleteWorkGroupFailure({
        projectId: 'project-1',
        kind: 'group',
        error:
          'This group still contains milestones or tickets. Remove them before deleting the group.',
      }),
    );
    subscription.unsubscribe();
  });

  it('shows a short success message for the completed action', () => {
    const subscription = effects.successMessages$.subscribe();

    actions$.next(
      WorkGroupsStoreActions.updateWorkGroupSuccess({
        projectId: 'project-1',
        workGroupId: 'group-1',
        kind: 'group',
      }),
    );

    expect(snackBar.success).toHaveBeenCalledWith('Group changes saved.');
    subscription.unsubscribe();
  });

  it('accepts another project create after reset cancels a pending request', () => {
    const firstRequest = new Subject<string>();
    const secondRequest = new Subject<string>();
    const emittedAction = vi.fn();
    service.createWorkGroup.mockReturnValueOnce(firstRequest).mockReturnValueOnce(secondRequest);

    const subscription = effects.create$.subscribe(emittedAction);
    actions$.next(
      WorkGroupsStoreActions.createWorkGroup({
        projectId: 'project-1',
        kind: 'group',
        command: { title: 'First group' },
      }),
    );
    actions$.next(WorkGroupsStoreActions.resetWorkGroups());
    actions$.next(
      WorkGroupsStoreActions.createWorkGroup({
        projectId: 'project-2',
        kind: 'milestone',
        command: { title: 'Second milestone', parentWorkGroupId: 'group-2' },
      }),
    );
    secondRequest.next('milestone-2');
    secondRequest.complete();
    firstRequest.next('group-1');
    firstRequest.complete();

    expect(service.createWorkGroup).toHaveBeenCalledTimes(2);
    expect(emittedAction).toHaveBeenCalledTimes(1);
    expect(emittedAction).toHaveBeenCalledWith(
      WorkGroupsStoreActions.createWorkGroupSuccess({
        projectId: 'project-2',
        id: 'milestone-2',
        kind: 'milestone',
        parentWorkGroupId: 'group-2',
      }),
    );
    subscription.unsubscribe();
  });

  it('cancels a pending update on reset', () => {
    const request = new Subject<void>();
    service.updateWorkGroup.mockReturnValue(request);

    const subscription = effects.update$.subscribe();
    actions$.next(
      WorkGroupsStoreActions.updateWorkGroup({
        projectId: 'project-1',
        workGroupId: 'group-1',
        kind: 'group',
        command: { title: 'Renamed group' },
      }),
    );
    expect(request.observed).toBe(true);

    actions$.next(WorkGroupsStoreActions.resetWorkGroups());

    expect(request.observed).toBe(false);
    subscription.unsubscribe();
  });

  it('cancels a pending delete on reset', () => {
    const request = new Subject<void>();
    service.deleteWorkGroup.mockReturnValue(request);

    const subscription = effects.delete$.subscribe();
    actions$.next(
      WorkGroupsStoreActions.deleteWorkGroup({
        projectId: 'project-1',
        workGroupId: 'group-1',
        kind: 'group',
      }),
    );
    expect(request.observed).toBe(true);

    actions$.next(WorkGroupsStoreActions.resetWorkGroups());

    expect(request.observed).toBe(false);
    subscription.unsubscribe();
  });
});
