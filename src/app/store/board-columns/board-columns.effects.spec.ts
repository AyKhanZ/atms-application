import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject, of, throwError } from 'rxjs';
import { WorkTaskStatus } from '../../core/enums/work-task-status.enum';
import { BoardColumnModel } from '../../core/models/board-columns';
import { BoardColumnService } from '../../core/services/board-column.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { translocoTestingProviders } from '../../core/testing/transloco-testing';
import { BoardColumnsEffects } from './board-columns.effects';
import * as Actions from './board-columns.actions';

const column: BoardColumnModel = {
  id: 4,
  code: 'InProgressDone',
  name: 'Done',
  label: 'In Progress · Done',
  category: WorkTaskStatus.InProgress,
  order: 3,
};

describe('BoardColumnsEffects', () => {
  let actions$: Subject<unknown>;
  const getAll = vi.fn();
  const error = vi.fn();

  function setup(loaded = false) {
    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        BoardColumnsEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            boardColumns: { items: loaded ? [column] : [], loaded, loading: false, error: null },
          },
        }),
        { provide: BoardColumnService, useValue: { getAll } },
        { provide: SnackBarService, useValue: { error } },
      ],
    });
    return TestBed.inject(BoardColumnsEffects);
  }

  beforeEach(() => {
    actions$ = new Subject<unknown>();
    getAll.mockReset();
    error.mockReset();
  });

  it('loads the columns once', () => {
    getAll.mockReturnValue(of([column]));
    const emitted = vi.fn();
    setup().load$.subscribe(emitted);

    actions$.next(Actions.load());

    expect(emitted).toHaveBeenCalledWith(Actions.loadSuccess({ items: [column] }));
  });

  it('skips a second load while the list is already loaded', () => {
    getAll.mockReturnValue(of([column]));
    const emitted = vi.fn();
    setup(true).load$.subscribe(emitted);

    actions$.next(Actions.load());

    expect(getAll).not.toHaveBeenCalled();
    expect(emitted).not.toHaveBeenCalled();
  });

  it('reads again on reload, even when loaded: names follow the language', () => {
    getAll.mockReturnValue(of([column]));
    const emitted = vi.fn();
    setup(true).reload$.subscribe(emitted);

    actions$.next(Actions.reload());

    expect(emitted).toHaveBeenCalledWith(Actions.loadSuccess({ items: [column] }));
  });

  it('reports a failed read with the shared text', () => {
    getAll.mockReturnValue(throwError(() => new Error('offline')));
    const effects = setup();
    const emitted = vi.fn();
    effects.load$.subscribe(emitted);
    effects.failed$.subscribe();

    actions$.next(Actions.load());
    actions$.next(emitted.mock.calls[0][0]);

    expect(emitted).toHaveBeenCalledWith(
      Actions.loadFailure({ error: "The board columns couldn't be loaded. Please try again." }),
    );
    expect(error).toHaveBeenCalledWith("The board columns couldn't be loaded. Please try again.");
  });
});
