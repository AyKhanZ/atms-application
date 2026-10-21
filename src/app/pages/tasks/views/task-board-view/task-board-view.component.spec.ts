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

import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
type LoadPage = ReturnType<typeof TaskBoardStoreActions.loadPage>;
type MoveTask = ReturnType<typeof TaskBoardStoreActions.moveTask>;

const columns = [
  { id: WorkTaskStatus.New, code: 'New', name: 'New', label: 'New', category: WorkTaskStatus.New, order: 1},
  { id: WorkTaskStatus.InProgress, code: 'InProgress', name: 'In Progress', label: 'In Progress', category: WorkTaskStatus.InProgress, order: 1},
  { id: WorkTaskStatus.Done, code: 'Done', name: 'Done', label: 'Done', category: WorkTaskStatus.Done, order: 1},
];
const statuses = columns.map((column) => ({ id: column.category, code: column.code, name: column.name }));
const past = '2020-01-01T00:00:00Z';
const future = '2099-01-01T00:00:00Z';

describe('TaskBoardViewComponent', () => {
  function setup(deadline: 'any' | 'none' = 'any') {
    const pages = signal<Record<string, TaskBoardPageState>>({});
    const dispatch = vi.fn();
    TestBed.configureTestingModule({
      imports: [TaskBoardViewComponent],
      providers: [...translocoTestingProviders(), 
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
    fixture.componentRef.setInput('columns', columns);
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
        .filter((load) => load.query.boardColumnIds?.[0] === status)
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
          load.query.overdue === true && load.query.boardColumnIds?.[0] === WorkTaskStatus.New
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
    expect(late[0].closest('.group').getAttribute('data-status')).toBe('New');
    expect(fixture.nativeElement.textContent).not.toContain('Overdue');
  });

  it('sends a reopened overdue card to the top of the Overdue group, whatever spot it was aimed at', () => {
    const { fixture, pages, loads, moves } = setup();
    const late = loads().find(
      (load) => load.query.boardColumnIds?.[0] === WorkTaskStatus.New && load.query.overdue === true,
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

    fixture.componentInstance.moveTo(reopened, { key: 'done', overdue: null }, WorkTaskStatus.New);

    expect(moves().at(-1)).toEqual(
      expect.objectContaining({
        to: late,
        index: 0,
        previousWorkTaskId: null,
        nextWorkTaskId: 'waiting',
      }),
    );
  });

  it('shows the overdue part of a column when it could not be read, with its error', () => {
    const { fixture, pages, loads } = setup();
    answer(pages, loads, []);
    const late = loads().find(
      (load) => load.query.boardColumnIds?.[0] === WorkTaskStatus.New && load.query.overdue === true,
    )!.key;
    pages.update((all) => ({
      ...all,
      [late]: { ...all[late], error: 'Tasks could not be loaded.' },
    }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Tasks could not be loaded.',
    );
  });

  describe('next page', () => {
    const done = (loads: () => LoadPage[]) =>
      loads().find((load) => load.query.boardColumnIds?.[0] === WorkTaskStatus.Done)!.key;
    const lane = (key: string) => ({ key, overdue: null });
    const page = (overrides: Partial<TaskBoardPageState>): TaskBoardPageState => ({
      items: [taskFixture({ id: 'shown', status: statuses[2] })],
      hasMore: true,
      nextCursor: 'next',
      loading: false,
      error: null,
      ...overrides,
    });

    it('is read when the end of a column is reached, with no Load more button to find', () => {
      const { fixture, pages, loads } = setup();
      const key = done(loads);
      pages.set({ [key]: page({}) });
      fixture.detectChanges();
      const board = fixture.componentInstance;

      expect(board.canLoadMore(lane(key))).toBe(true);
      expect(fixture.nativeElement.querySelector('app-load-more-button')).toBeNull();

      board.loadMore(board.columns()[2], lane(key));
      expect(loads().at(-1)).toEqual(expect.objectContaining({ key, cursor: 'next' }));
    });

    it.each([
      ['nothing is left', { hasMore: false, nextCursor: null }],
      ['it is already being read', { loading: true }],
      ['the last try failed', { error: 'Tasks could not be loaded.' }],
    ])('is not read when %s', (_, overrides) => {
      const { pages, loads, fixture } = setup();
      const key = done(loads);
      pages.set({ [key]: page(overrides) });

      expect(fixture.componentInstance.canLoadMore(lane(key))).toBe(false);
    });

    // a page arriving under the pointer would move the card being dragged
    it('waits while a card is dragged', () => {
      const { pages, loads, fixture } = setup();
      const key = done(loads);
      pages.set({ [key]: page({}) });

      fixture.componentInstance.dragging.set(true);

      expect(fixture.componentInstance.canLoadMore(lane(key))).toBe(false);
    });

    it.each([
      ['the first page again when it failed', null],
      ['the page that failed after the first', 'next'],
    ])('Try again reads %s', (_, cursor) => {
      const { fixture, pages, loads } = setup();
      const key = done(loads);
      pages.set({
        [key]: page({
          items: cursor ? page({}).items : [],
          nextCursor: cursor,
          error: 'Tasks could not be loaded.',
        }),
      });
      fixture.detectChanges();

      fixture.nativeElement.querySelector('[role="alert"] button').click();

      expect(loads().at(-1)).toEqual(expect.objectContaining({ key, cursor }));
    });
  });

  it('shows every status as a column: the board has no Status filter', () => {
    const { fixture } = setup();

    fixture.componentRef.setInput('query', {
      ...emptyWorkTaskBoardFilter,
      statusIds: [WorkTaskStatus.InProgress],
    });

    expect(fixture.componentInstance.columns().map((column) => column.id)).toEqual([
      WorkTaskStatus.New,
      WorkTaskStatus.InProgress,
      WorkTaskStatus.Done,
    ]);
  });

  it('switches the phone to the first column shown when the Overdue filter hides Done', () => {
    const { fixture } = setup();
    fixture.componentInstance.phoneColumn.set(WorkTaskStatus.Done);

    fixture.componentRef.setInput('query', { ...emptyWorkTaskBoardFilter, deadline: 'overdue' });

    expect(fixture.componentInstance.phoneColumn()).toBe(WorkTaskStatus.New);
  });

  it('does not reorder cards within Done: it is ordered by close date', () => {
    const { fixture, moves } = setup();
    const done = fixture.componentInstance
      .columns()
      .find((c) => c.category === WorkTaskStatus.Done)!;
    const lane = { column: done, lane: done.lanes[0] };

    fixture.componentInstance.drop({
      item: { data: taskFixture({ status: statuses[2] }) },
      previousContainer: { data: lane },
      container: { data: lane },
      previousIndex: 2,
      currentIndex: 0,
    } as never);

    expect(moves()).toEqual([]);
  });

  it('keeps cards on their side of the overdue line while dragging', () => {
    const { fixture, pages, loads } = setup();
    const board = fixture.componentInstance;
    const drag = (deadline: string) => ({ data: taskFixture({ deadline }) }) as never;
    const into = (status: WorkTaskStatus) =>
      ({
        data: { column: { lanes: board.columns().find((c) => c.category === status)!.lanes } },
      }) as never;
    answer(pages, loads, [taskFixture({ id: 'late', deadline: past })]);

    expect(board.acceptsLate(drag(past))).toBe(true);
    expect(board.acceptsLate(drag(future))).toBe(false);
    // New has overdue work above the line: a late card may not go below it.
    expect(board.acceptsOnTime(drag(past), into(WorkTaskStatus.New))).toBe(false);
    expect(board.acceptsOnTime(drag(future), into(WorkTaskStatus.New))).toBe(true);
    // In Progress has none: a late card lands anywhere and is moved on top after the drop.
    expect(board.acceptsOnTime(drag(past), into(WorkTaskStatus.InProgress))).toBe(true);
  });

  // In Progress holds Doing and Done under one status header, like split columns in Azure
  it('puts the columns of one status side by side under its header, with one total', () => {
    const { fixture } = setup();
    const split = [
      columns[0],
      { id: 2, code: 'InProgressDoing', name: 'Doing', label: 'In Progress · Doing', category: WorkTaskStatus.InProgress, order: 2 },
      { id: 4, code: 'InProgressDone', name: 'Done', label: 'In Progress · Done', category: WorkTaskStatus.InProgress, order: 3 },
      columns[2],
    ];
    fixture.componentRef.setInput('columns', split);
    fixture.componentRef.setInput('statuses', statuses);
    fixture.detectChanges();
    const board = fixture.componentInstance;

    expect(board.groups().map((group) => [group.name, group.columns.map((column) => column.name)])).toEqual([
      ['New', ['New']],
      ['In Progress', ['Doing', 'Done']],
      ['Done', ['Done']],
    ]);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.group')).toHaveLength(3);
    // a single column needs no sub-heading, the status header names it
    expect(element.querySelectorAll('.column__sub')).toHaveLength(2);
    expect(board.boardTemplate()).toBe('minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)');
    // the phone has a tab per status, not per column
    expect(element.querySelectorAll('.switcher__tab')).toHaveLength(3);
    expect(element.querySelector('.halves')).toBeNull();
  });

  // a split status shows its halves as a toggle, and coming back to it opens the half left open
  it('switches the halves of a split status on the phone and remembers the open one', () => {
    const { fixture } = setup();
    const split = [
      columns[0],
      { id: 2, code: 'InProgressDoing', name: 'Doing', label: 'In Progress · Doing', category: WorkTaskStatus.InProgress, order: 2 },
      { id: 4, code: 'InProgressDone', name: 'Done', label: 'In Progress · Done', category: WorkTaskStatus.InProgress, order: 3 },
      columns[2],
    ];
    fixture.componentRef.setInput('columns', split);
    fixture.componentRef.setInput('statuses', statuses);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const tab = (index: number) => element.querySelectorAll<HTMLButtonElement>('.switcher__tab')[index];
    // jsdom has no scrolling
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
    onTestFinished(() => {
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    tab(1).click();
    fixture.detectChanges();
    const halves = element.querySelectorAll<HTMLButtonElement>('.halves__tab');
    expect([...halves].map((half) => half.textContent?.trim().split(/\s+/)[0])).toEqual(['Doing', 'Done']);
    expect(fixture.componentInstance.phoneColumn()).toBe(2);

    halves[1].click();
    tab(0).click();
    tab(1).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.phoneColumn()).toBe(4);
  });
});
