import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { Popover } from 'primeng/popover';
import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
import {
  WorkTaskBoardQuery,
  calendarDayOrder,
  emptyWorkTaskBoardFilter,
} from '../../../../core/models/work-task-board';
import { TaskBoardStoreActions, TaskBoardStoreSelectors } from '../../../../store/task-board';
import { TaskCalendarViewComponent } from './task-calendar-view.component';
import { taskFixture } from '../../testing/task-fixture';

function render(query: WorkTaskBoardQuery = emptyWorkTaskBoardFilter) {
  const pages: WritableSignal<Record<string, unknown>> = signal({});
  const dispatch = vi.fn();
  TestBed.configureTestingModule({
    imports: [TaskCalendarViewComponent],
    providers: [
      ...translocoTestingProviders(),
      provideRouter([]),
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
  const fixture = TestBed.createComponent(TaskCalendarViewComponent);
  fixture.componentRef.setInput('query', query);
  fixture.componentRef.setInput('month', '2026-09');
  fixture.detectChanges();
  const actions = () => dispatch.mock.calls.map(([action]) => action);
  const month = actions().find((action) => action.type === TaskBoardStoreActions.loadCalendar.type);
  return { fixture, pages, dispatch, actions, monthKey: month?.key as string };
}

// the month summary of 17 September: 40 tasks, the first three of them as cards
function busyDay(pages: WritableSignal<Record<string, unknown>>, monthKey: string) {
  const deadline = new Date(2026, 8, 17).toISOString();
  const items = ['a', 'b', 'c'].map((id) => taskFixture({ id, title: `Task ${id}`, deadline }));
  pages.set({
    [monthKey]: {
      items,
      totals: { [Date.parse(deadline)]: 40 },
      hasMore: false,
      nextCursor: null,
      loading: false,
      error: null,
    },
  });
}

describe('TaskCalendarViewComponent', () => {
  it('asks for the visible month in one request and keeps the Overdue filter', () => {
    const { actions } = render({ ...emptyWorkTaskBoardFilter, deadline: 'overdue', projectIds: ['p1'] });

    expect(actions()).toContainEqual(
      expect.objectContaining({
        type: TaskBoardStoreActions.loadCalendar.type,
        query: expect.objectContaining({
          projectIds: ['p1'],
          deadline: 'overdue',
          deadlineFrom: new Date(2026, 8, 1).toISOString(),
          deadlineTo: new Date(2026, 9, 1).toISOString(),
        }),
      }),
    );
    // The month itself and nothing else: the only other call keeps just this list in the store.
    expect(actions()).toHaveLength(2);
    expect(actions()).toContainEqual(
      expect.objectContaining({ type: TaskBoardStoreActions.keepPages.type }),
    );
  });

  it('counts "+ N more" from the day total, not from the cards that came', () => {
    const { fixture, pages, monthKey } = render();
    busyDay(pages, monthKey);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    // the test page has no layout, a cell fits one card
    expect(element.querySelectorAll('.day__tasks .chip').length).toBe(1);
    expect(element.querySelector('.day__more')?.textContent).toContain('39');
  });

  it('reads the opened day 50 at a time, in the order the month took its first cards', async () => {
    const { fixture, pages, monthKey, actions } = render();
    busyDay(pages, monthKey);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLButtonElement>('.day__more')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const first = actions().find((action) => action.type === TaskBoardStoreActions.loadPage.type);
    expect(first).toEqual(
      expect.objectContaining({
        order: calendarDayOrder,
        pageSize: 50,
        cursor: null,
        query: expect.objectContaining({
          deadlineFrom: new Date(2026, 8, 17).toISOString(),
          deadlineTo: new Date(2026, 8, 18).toISOString(),
        }),
      }),
    );
    expect(first.key).not.toBe(monthKey);

    const day = ['a', 'b', 'c', 'd', 'e'].map((id) => taskFixture({ id, title: `Day ${id}` }));
    pages.update((all) => ({
      ...all,
      [first.key]: { items: day, hasMore: true, nextCursor: 'next-50', loading: false, error: null },
    }));
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = document.querySelector('.calendar-day-panel');
    expect(panel?.querySelectorAll('.chip').length).toBe(5);
    expect(panel?.textContent).toContain('40');
    expect(element.querySelector('.day__more')?.getAttribute('aria-expanded')).toBe('true');

    panel?.querySelector<HTMLButtonElement>('app-load-more-button button')?.click();

    expect(actions().filter((action) => action.type === TaskBoardStoreActions.loadPage.type).at(-1)).toEqual(
      expect.objectContaining({ key: first.key, cursor: 'next-50' }),
    );
  });

  // placed while it holds only the skeleton, the panel would grow off the bottom of the screen
  it('places the open day panel again once its tasks come', async () => {
    const { fixture, pages, monthKey, actions } = render();
    busyDay(pages, monthKey);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLButtonElement>('.day__more')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const popover: Popover = fixture.debugElement.query(By.directive(Popover)).componentInstance;
    const align = vi.spyOn(popover, 'align');
    const first = actions().find((action) => action.type === TaskBoardStoreActions.loadPage.type);
    const day = ['a', 'b', 'c'].map((id) => taskFixture({ id, title: `Day ${id}` }));
    pages.update((all) => ({
      ...all,
      [first.key]: { items: day, hasMore: false, nextCursor: null, loading: false, error: null },
    }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(align).toHaveBeenCalled();
  });
});
