import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { Subject } from 'rxjs';
import { HistoryPageModel, HistoryStateModel } from '../../core/models/history';
import { HistoryService } from '../../core/services/history.service';
import * as Actions from './history.actions';
import { HistoryEffects } from './history.effects';

describe('HistoryEffects', () => {
  let actions: Subject<Action>;
  let pageResponse: Subject<HistoryPageModel>;
  let statesResponse: Subject<HistoryStateModel[]>;
  let emitted: Action[];
  let effects: HistoryEffects;

  const historyKey = 'task:t';
  const scope = { kind: 'task', workTaskId: 't' } as const;
  const page: HistoryPageModel = { items: [], nextCursor: null, hasMore: false, pageSize: 20 };

  beforeEach(() => {
    actions = new Subject<Action>();
    pageResponse = new Subject<HistoryPageModel>();
    statesResponse = new Subject<HistoryStateModel[]>();
    emitted = [];
    TestBed.configureTestingModule({
      providers: [
        HistoryEffects,
        provideMockActions(() => actions),
        {
          provide: HistoryService,
          useValue: { getHistory: () => pageResponse, getStates: () => statesResponse },
        },
      ],
    });
    effects = TestBed.inject(HistoryEffects);
  });

  const respond = (states: HistoryStateModel[] | Error) => {
    pageResponse.next(page);
    pageResponse.complete();
    if (states instanceof Error) {
      statesResponse.error(states);
    } else {
      statesResponse.next(states);
      statesResponse.complete();
    }
  };

  it('reads the page and the statuses together', () => {
    effects.load$.subscribe((action) => emitted.push(action));
    actions.next(Actions.load({ historyKey, projectId: 'p', scope }));
    respond([]);

    expect(emitted).toEqual([Actions.loadSuccess({ historyKey, page, states: [] })]);
  });

  it('still shows the list when the statuses cannot be read', () => {
    effects.load$.subscribe((action) => emitted.push(action));
    actions.next(Actions.load({ historyKey, projectId: 'p', scope }));
    respond(new Error('states failed'));

    expect(emitted).toEqual([Actions.loadSuccess({ historyKey, page, states: null })]);
  });

  it('reports a failed page', () => {
    effects.load$.subscribe((action) => emitted.push(action));
    actions.next(Actions.load({ historyKey, projectId: 'p', scope }));
    pageResponse.error(new Error('down'));

    expect(emitted).toEqual([Actions.loadFailure({ historyKey, error: "Couldn't load history." })]);
  });

  it('drops a load still on its way when the history leaves the screen', () => {
    effects.load$.subscribe((action) => emitted.push(action));
    actions.next(Actions.load({ historyKey, projectId: 'p', scope }));
    actions.next(Actions.clear({ historyKey }));
    respond([]);

    expect(emitted).toEqual([]);
  });

  it('drops a next page of the old list once the list is read again', () => {
    effects.loadMore$.subscribe((action) => emitted.push(action));
    actions.next(Actions.loadMore({ historyKey, projectId: 'p', scope, cursor: 'c' }));
    actions.next(Actions.load({ historyKey, projectId: 'p', scope }));
    pageResponse.next(page);

    expect(emitted).toEqual([]);
  });
});
