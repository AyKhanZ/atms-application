import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { emptyWorkTaskBoardFilter } from '../../core/models/work-task-board';
import { WorkTaskPageModel } from '../../core/models/work-tasks';
import { WorkTaskBoardService } from '../../core/services/work-task-board.service';
import { WorkTasksService } from '../../core/services/work-tasks.service';
import { taskFixture } from '../../pages/tasks/testing/task-fixture';
import { AuthStoreActions } from '../auth';
import * as Actions from './task-board.actions';
import { TaskBoardEffects } from './task-board.effects';

describe('TaskBoardEffects', () => {
  let actions: Subject<Action>;
  let pageResponse: Subject<WorkTaskPageModel>;
  let moveResponses: Subject<void>[];
  let emitted: Action[];

  beforeEach(() => {
    actions = new Subject<Action>();
    pageResponse = new Subject<WorkTaskPageModel>();
    moveResponses = [];
    emitted = [];
    TestBed.configureTestingModule({
      providers: [
        TaskBoardEffects,
        provideMockActions(() => actions),
        { provide: WorkTaskBoardService, useValue: { getPage: () => pageResponse } },
        {
          provide: WorkTasksService,
          useValue: {
            moveWorkTask: () => {
              const response = new Subject<void>();
              moveResponses.push(response);
              return response;
            },
          },
        },
      ],
    });
    const effects = TestBed.inject(TaskBoardEffects);
    effects.loadPage$.subscribe((action) => emitted.push(action));
    effects.moveTask$.subscribe((action) => emitted.push(action));
  });

  const load = (key: string) =>
    actions.next(
      Actions.loadPage({
        key,
        query: emptyWorkTaskBoardFilter,
        order: { sort: 1, direction: 1 },
        pageSize: 20,
        cursor: null,
      }),
    );
  const move = (id: string) =>
    actions.next(
      Actions.moveTask({
        task: taskFixture({ id }),
        from: 'new',
        to: 'done',
        index: 0,
        status: { id: 3, code: 'Done', name: 'Done' },
        previousWorkTaskId: null,
        nextWorkTaskId: null,
        completeSubtasks: false,
      }),
    );
  const page: WorkTaskPageModel = { items: [], hasMore: false, nextCursor: null, pageSize: 20 };

  /* A filter changed while a column was read: its answer came late and put the old list back. */
  it('drops the answer for a list the view no longer shows', () => {
    load('old');
    actions.next(Actions.keepPages({ keys: ['new'] }));
    pageResponse.next(page);

    expect(emitted).toEqual([]);
  });

  it('keeps reading a list the view still shows', () => {
    load('new');
    actions.next(Actions.keepPages({ keys: ['new'] }));
    pageResponse.next(page);

    expect(emitted).toEqual([Actions.loadPageSuccess({ key: 'new', append: false, page })]);
  });

  it('sends moves one after another, and none of those queued at sign-out', () => {
    move('first');
    move('second');
    expect(moveResponses.length).toBe(1);

    actions.next(AuthStoreActions.logoutCompleted());
    moveResponses[0].next();
    moveResponses[0].complete();

    expect(moveResponses.length).toBe(1);
    expect(emitted).toEqual([]);

    // The next session starts with an empty queue and still moves cards.
    move('third');
    expect(moveResponses.length).toBe(2);
  });
});
