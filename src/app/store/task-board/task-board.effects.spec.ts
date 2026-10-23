import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { translocoTestingProviders } from '../../core/testing/transloco-testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import {
  WorkTaskDeadlineGroupModel,
  emptyWorkTaskBoardFilter,
} from '../../core/models/work-task-board';
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
  let calendarResponse: Subject<WorkTaskDeadlineGroupModel[]>;
  let calendarRequests: number;
  let moveResponses: Subject<void>[];
  let emitted: Action[];

  beforeEach(() => {
    actions = new Subject<Action>();
    pageResponse = new Subject<WorkTaskPageModel>();
    calendarResponse = new Subject<WorkTaskDeadlineGroupModel[]>();
    calendarRequests = 0;
    moveResponses = [];
    emitted = [];
    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        TaskBoardEffects,
        provideMockActions(() => actions),
        {
          provide: WorkTaskBoardService,
          useValue: {
            getPage: () => pageResponse,
            getCalendar: () => {
              calendarRequests++;
              return calendarResponse;
            },
          },
        },
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
    effects.loadCalendar$.subscribe((action) => emitted.push(action));
  });

  it('reads a calendar month in one request', () => {
    const groups = [{ deadline: '2026-09-16T20:00:00Z', total: 151, workTasks: [taskFixture()] }];

    actions.next(Actions.loadCalendar({ key: 'month', query: emptyWorkTaskBoardFilter }));
    calendarResponse.next(groups);
    calendarResponse.complete();

    expect(calendarRequests).toBe(1);
    expect(emitted).toEqual([Actions.loadCalendarSuccess({ key: 'month', groups })]);
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
        boardColumn: { id: 3, code: 'Done', name: 'Done' },
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
