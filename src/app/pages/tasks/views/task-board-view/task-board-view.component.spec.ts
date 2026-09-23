import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { emptyWorkTaskBoardFilter } from '../../../../core/models/work-task-board';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { taskFixture } from '../../testing/task-fixture';
import { TaskBoardViewComponent } from './task-board-view.component';

type LoadPage = ReturnType<typeof TaskBoardStoreActions.loadPage>;
type MoveTask = ReturnType<typeof TaskBoardStoreActions.moveTask>;

const statuses = [
  { id: WorkTaskStatus.New, code: 'New', name: 'New' },
  { id: WorkTaskStatus.InProgress, code: 'InProgress', name: 'In Progress' },
  { id: WorkTaskStatus.Done, code: 'Done', name: 'Done' },
];
const past = '2020-01-01T00:00:00Z';
const future = '2099-01-01T00:00:00Z';

describe('TaskBoardViewComponent', () => {
  function setup(deadline: 'any' | 'none' = 'any') {
    const pages = signal<Record<string, TaskBoardPageState>>({});
    const dispatch = vi.fn();
    TestBed.configureTestingModule({
      imports: [TaskBoardViewComponent],
      providers: [
        provideRouter([]),
        ConfirmationService,
        {
          provide: Store,
          useValue: {
            selectSignal: (selector: unknown) =>
              selector === TaskBoardStoreSelectors.getPages ? pages : signal(null),
            dispatch,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(TaskBoardViewComponent);
    fixture.componentRef.setInput('query', { ...emptyWorkTaskBoardFilter, deadline });
    fixture.componentRef.setInput('statuses', statuses);
    fixture.componentRef.setInput('canMove', true);
    fixture.detectChanges();
    const loads = (): LoadPage[] =>
      dispatch.mock.calls
        .map(([action]) => action)
        .filter((action) => action.type === TaskBoardStoreActions.loadPage.type);
    const moves = (): MoveTask[] =>
      dispatch.mock.calls
        .map(([action]) => action)
        .filter((action) => action.type === TaskBoardStoreActions.moveTask.type);
    return { fixture, pages, loads, moves };
  }

  it('reads overdue work and the rest of each open column apart, and Done whole', () => {
    const { loads } = setup();
    const byStatus = (status: WorkTaskStatus) =>
      loads()
        .filter((load) => load.query.statusIds[0] === status)
        .map((load) => load.query.overdue);

    expect(byStatus(WorkTaskStatus.New)).toEqual([true, false]);
    expect(byStatus(WorkTaskStatus.InProgress)).toEqual([true, false]);
    expect(byStatus(WorkTaskStatus.Done)).toEqual([undefined]);
  });

  it('does not ask for overdue work when only tasks without a deadline are shown', () => {
    const { loads } = setup('none');
    expect(loads().some((load) => load.query.overdue === true)).toBe(false);
  });

  /** Answers every first-page request: overdue work in New only, nothing anywhere else. */
  function answer(
    pages: ReturnType<typeof setup>['pages'],
    loads: () => LoadPage[],
    late: ReturnType<typeof taskFixture>[],
  ) {
    const empty = { items: [], hasMore: false, nextCursor: null, loading: false, error: null };
    pages.set(
      Object.fromEntries(
        loads().map((load) => [
          load.key,
          load.query.overdue === true && load.query.statusIds[0] === WorkTaskStatus.New
            ? { ...empty, items: late }
            : empty,
        ]),
      ),
    );
  }

  it('draws the overdue part only in a column that has overdue work, with no heading', () => {
    const { fixture, pages, loads } = setup();
    answer(pages, loads, [taskFixture({ id: 'late', deadline: past })]);
    fixture.detectChanges();

    const late = fixture.nativeElement.querySelectorAll('.column__list--late');
    expect(late.length).toBe(1);
    expect(late[0].closest('.column').getAttribute('data-status')).toBe('New');
    expect(fixture.nativeElement.textContent).not.toContain('Overdue');
  });

  it('sends a reopened overdue card to the top of the Overdue group, whatever spot it was aimed at', () => {
    const { fixture, pages, loads, moves } = setup();
    const late = loads().find(
      (load) => load.query.statusIds[0] === WorkTaskStatus.New && load.query.overdue === true,
    )!.key;
    const waiting = taskFixture({ id: 'waiting', deadline: past });
    pages.set({
      [late]: { items: [waiting], hasMore: false, nextCursor: null, loading: false, error: null },
    });
    const reopened = taskFixture({
      id: 'reopened',
      deadline: past,
      subtaskCount: 0,
      doneSubtaskCount: 0,
      status: statuses[2],
    });

    fixture.componentInstance.moveTo(
      reopened,
      { key: 'done', overdue: null },
      WorkTaskStatus.New,
    );

    expect(moves().at(-1)).toEqual(
      expect.objectContaining({ to: late, index: 0, previousWorkTaskId: null, nextWorkTaskId: 'waiting' }),
    );
  });

  it('keeps cards on their side of the overdue line while dragging', () => {
    const { fixture, pages, loads } = setup();
    const board = fixture.componentInstance;
    const drag = (deadline: string) => ({ data: taskFixture({ deadline }) }) as never;
    const into = (status: WorkTaskStatus) =>
      ({ data: { column: { lanes: board.columns().find((c) => c.status.id === status)!.lanes } } }) as never;
    answer(pages, loads, [taskFixture({ id: 'late', deadline: past })]);

    expect(board.acceptsLate(drag(past))).toBe(true);
    expect(board.acceptsLate(drag(future))).toBe(false);
    // New has overdue work above the line: a late card may not go below it.
    expect(board.acceptsOnTime(drag(past), into(WorkTaskStatus.New))).toBe(false);
    expect(board.acceptsOnTime(drag(future), into(WorkTaskStatus.New))).toBe(true);
    // In Progress has none: a late card lands anywhere and is moved on top after the drop.
    expect(board.acceptsOnTime(drag(past), into(WorkTaskStatus.InProgress))).toBe(true);
  });
});
