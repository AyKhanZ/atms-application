import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { WorkTaskPageModel } from '../../core/models/work-tasks';
import { WorkTasksService } from '../../core/services/work-tasks.service';
import * as Actions from './work-tasks.actions';
import { WorkTasksEffects } from './work-tasks.effects';

describe('WorkTasksEffects', () => {
  let actions: Subject<Action>;
  let response: Subject<WorkTaskPageModel>;
  let emitted: Action[];

  beforeEach(() => {
    actions = new Subject<Action>();
    response = new Subject<WorkTaskPageModel>();
    emitted = [];
    TestBed.configureTestingModule({
      providers: [
        WorkTasksEffects,
        provideMockActions(() => actions),
        { provide: WorkTasksService, useValue: { getWorkTasks: () => response } },
      ],
    });
    TestBed.inject(WorkTasksEffects).loadTasks$.subscribe((action) => emitted.push(action));
  });

  const load = (requestKey: string) =>
    actions.next(Actions.loadTasks({ requestKey, projectId: 'p', filter: {}, append: false }));
  const page: WorkTaskPageModel = { items: [], hasMore: false, nextCursor: null, pageSize: 10 };

  /* Leaving a list clears its page. An answer arriving after that used to put the page back. */
  it('drops the answer for a list that was cleared', () => {
    load('first');
    actions.next(Actions.clearPage({ requestKey: 'first' }));
    response.next(page);

    expect(emitted).toEqual([]);
  });

  it('does not cancel another list when one is cleared', () => {
    load('first');
    actions.next(Actions.clearPage({ requestKey: 'second' }));
    response.next(page);

    expect(emitted).toEqual([
      Actions.loadTasksSuccess({ requestKey: 'first', append: false, page }),
    ]);
  });
});
