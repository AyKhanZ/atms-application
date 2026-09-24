import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  emptyWorkTaskBoardFilter,
  WorkTaskBoardSort,
} from '../../../../core/models/work-task-board';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { LayoutService } from '../../../../core/services/layout.service';
import { TaskBoardPageState, TaskBoardStoreActions } from '../../../../store/task-board';
import { taskFixture } from '../../testing/task-fixture';
import { TaskListViewComponent } from './task-list-view.component';

type LoadPage = ReturnType<typeof TaskBoardStoreActions.loadPage>;

const pageOf = (items: WorkTaskModel[], nextCursor: string | null = null): TaskBoardPageState => ({
  items,
  hasMore: nextCursor !== null,
  nextCursor,
  loading: false,
  error: null,
});

describe('TaskListViewComponent', () => {
  function setup(phone = false) {
    const pages = signal<Record<string, TaskBoardPageState>>({});
    const dispatch = vi.fn();
    TestBed.configureTestingModule({
      imports: [TaskListViewComponent],
      providers: [
        provideRouter([]),
        { provide: Store, useValue: { selectSignal: () => pages, dispatch } },
        { provide: LayoutService, useValue: { isPhone: signal(phone) } },
      ],
    });
    const fixture = TestBed.createComponent(TaskListViewComponent);
    fixture.componentRef.setInput('query', emptyWorkTaskBoardFilter);
    fixture.detectChanges();
    const requests = (): LoadPage[] =>
      dispatch.mock.calls
        .map(([action]) => action)
        .filter((action) => action.type === TaskBoardStoreActions.loadPage.type);
    /** Answers the latest overdue and on-time requests. */
    const answer = (late: TaskBoardPageState, rest: TaskBoardPageState) => {
      const latest = requests().filter((request) => request.cursor === null);
      const lateKey = latest.filter((request) => request.query.overdue === true).at(-1)!.key;
      const restKey = latest.filter((request) => request.query.overdue === false).at(-1)!.key;
      pages.update((current) => ({ ...current, [lateKey]: late, [restKey]: rest }));
      fixture.detectChanges();
    };
    const rows = [taskFixture()];
    answer(pageOf([]), pageOf(rows));
    return { fixture, requests, answer, rows };
  }

  it('asks for overdue work and for the rest separately, in the same order', () => {
    const { requests } = setup();
    const [late, rest] = requests();
    expect(late.query.overdue).toBe(true);
    expect(rest.query.overdue).toBe(false);
    expect(late.order).toEqual(rest.order);
  });

  it('puts overdue rows first and holds the rest back until the overdue part is all loaded', () => {
    const { fixture, requests, answer } = setup();
    const late = taskFixture({ id: 'late', deadline: '2020-01-01T00:00:00Z' });
    const rest = taskFixture({ id: 'rest' });

    answer(pageOf([late], 'next-late'), pageOf([rest]));
    expect(fixture.componentInstance.items().map((task) => task.id)).toEqual(['late']);
    expect(fixture.nativeElement.querySelector('tbody tr').classList).toContain('overdue-row');

    fixture.componentInstance.loadMore();
    const more = requests().at(-1)!;
    expect(more.cursor).toBe('next-late');
    expect(more.query.overdue).toBe(true);

    answer(pageOf([late]), pageOf([rest]));
    expect(fixture.componentInstance.items().map((task) => task.id)).toEqual(['late', 'rest']);
  });

  it('asks only for work without a deadline when that filter is on: none of it can be overdue', () => {
    const { fixture, requests } = setup();
    fixture.componentRef.setInput('query', { ...emptyWorkTaskBoardFilter, deadline: 'none' });
    fixture.detectChanges();
    const latest = requests().filter((request) => request.query.deadline === 'none');
    expect(latest.map((request) => request.query.overdue)).toEqual([false]);
  });

  it('keeps rows and their DOM nodes while the server reorders the same results', () => {
    const { fixture, answer, rows } = setup();
    const before = fixture.nativeElement.querySelector('tbody tr');
    fixture.componentRef.setInput('order', { sort: WorkTaskBoardSort.State, direction: 1 });
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual(rows);
    expect(fixture.nativeElement.querySelector('tbody tr')).toBe(before);
    answer(pageOf([]), pageOf(rows));
    expect(fixture.nativeElement.querySelector('tbody tr')).toBe(before);
  });

  it('does not retain rows from a different filter', () => {
    const { fixture } = setup();
    fixture.componentRef.setInput('query', { ...emptyWorkTaskBoardFilter, search: 'different' });
    fixture.detectChanges();
    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('emits the real title and state sorts rather than board rank', () => {
    const { fixture } = setup();
    const emit = vi.spyOn(fixture.componentInstance.orderChange, 'emit');
    fixture.componentInstance.changeSort({ field: 'state', order: 1 });
    expect(emit).toHaveBeenLastCalledWith({ sort: WorkTaskBoardSort.State, direction: 1 });
    fixture.componentInstance.changeSort({ field: 'title', order: -1 });
    expect(emit).toHaveBeenLastCalledWith({ sort: WorkTaskBoardSort.Title, direction: 2 });
    fixture.componentInstance.changeSort({ field: 'code', order: 1 });
    expect(emit).toHaveBeenLastCalledWith({ sort: WorkTaskBoardSort.Code, direction: 1 });
    expect(fixture.nativeElement.querySelector('app-task-context')).toBeNull();
    expect(fixture.nativeElement.querySelector('.code-cell').textContent.trim()).toBe('#34');
  });

  it('draws the table and not the phone rows on a wide screen', () => {
    const { fixture } = setup();
    expect(fixture.nativeElement.querySelector('p-table')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.rows')).toBeNull();
  });

  it('draws a two-line row per task for the phone, overdue marked the same way', () => {
    const { fixture, answer } = setup(true);
    answer(
      pageOf([taskFixture({ id: 'late', deadline: '2020-01-01T00:00:00Z' })]),
      pageOf([taskFixture({ id: 'rest' })]),
    );
    const rows = fixture.nativeElement.querySelectorAll('.rows .row');

    expect(fixture.nativeElement.querySelector('p-table')).toBeNull();
    expect(rows.length).toBe(2);
    expect(rows[0].classList).toContain('row--overdue');
    expect(rows[0].querySelector('.overdue-badge')).not.toBeNull();
    expect(rows[1].querySelector('app-task-status-badge')).not.toBeNull();
  });

  it('shows an empty result without another Clear button', () => {
    const { fixture, answer } = setup();
    answer(pageOf([]), pageOf([]));
    expect(fixture.nativeElement.querySelector('app-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-clear-button')).toBeNull();
  });
});
