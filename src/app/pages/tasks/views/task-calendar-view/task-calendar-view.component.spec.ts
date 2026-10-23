import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
import { emptyWorkTaskBoardFilter } from '../../../../core/models/work-task-board';
import { TaskBoardStoreActions, TaskBoardStoreSelectors } from '../../../../store/task-board';
import { TaskCalendarViewComponent } from './task-calendar-view.component';
import { taskFixture } from '../../testing/task-fixture';

describe('TaskCalendarViewComponent', () => {
  it('loads only the visible month and preserves the Overdue filter without an undated count request', () => {
    const dispatch = vi.fn();
    TestBed.configureTestingModule({
      imports: [TaskCalendarViewComponent],
      providers: [
        ...translocoTestingProviders(),
        {
          provide: Store,
          useValue: {
            selectSignal: (selector: unknown) =>
              selector === TaskBoardStoreSelectors.getPages ? signal({}) : signal(null),
            dispatch,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(TaskCalendarViewComponent);
    fixture.componentRef.setInput('query', {
      ...emptyWorkTaskBoardFilter,
      deadline: 'overdue',
      projectIds: ['p1'],
    });
    fixture.componentRef.setInput('month', '2026-09');
    fixture.detectChanges();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TaskBoardStoreActions.loadAll.type,
        query: expect.objectContaining({
          ...emptyWorkTaskBoardFilter,
          projectIds: ['p1'],
          deadline: 'overdue',
          deadlineFrom: new Date(2026, 8, 1).toISOString(),
          deadlineTo: new Date(2026, 9, 1).toISOString(),
        }),
      }),
    );
    // The month itself and nothing else: the only other call keeps just this list in the store.
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: TaskBoardStoreActions.keepPages.type }),
    );
    expect(fixture.nativeElement.textContent).not.toContain('Without deadline');
  });
});

describe('TaskCalendarViewComponent month limit', () => {
  it.each([
    [true, true],
    [false, false],
  ])('a month cut at the limit (%s) says so: %s', (hasMore, shown) => {
    const pages = signal<Record<string, unknown>>({});
    const dispatch = vi.fn();
    TestBed.configureTestingModule({
      imports: [TaskCalendarViewComponent],
      providers: [
        ...translocoTestingProviders(),
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
    fixture.componentRef.setInput('query', emptyWorkTaskBoardFilter);
    fixture.componentRef.setInput('month', '2026-09');
    fixture.detectChanges();
    const month = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === TaskBoardStoreActions.loadAll.type);

    pages.set({
      [month.key]: { items: [], hasMore, nextCursor: null, loading: false, error: null },
    });
    fixture.detectChanges();

    expect(!!fixture.nativeElement.querySelector('.head__cut')).toBe(shown);
  });
});

describe('TaskCalendarViewComponent busy day', () => {
  it('opens the whole day in a panel over the grid, the cell keeps its cards', async () => {
    const pages = signal<Record<string, unknown>>({});
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
    fixture.componentRef.setInput('query', emptyWorkTaskBoardFilter);
    fixture.componentRef.setInput('month', '2026-09');
    fixture.detectChanges();
    const month = dispatch.mock.calls
      .map(([action]) => action)
      .find((action) => action.type === TaskBoardStoreActions.loadAll.type);
    const deadline = new Date(2026, 8, 17).toISOString();
    const items = ['a', 'b', 'c'].map((id) =>
      taskFixture({ id, title: `Task ${id}`, deadline }),
    );
    pages.set({
      [month.key]: { items, hasMore: false, nextCursor: null, loading: false, error: null },
    });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const more = element.querySelector<HTMLButtonElement>('.day__more');

    more?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = document.querySelector('.calendar-day-panel');
    expect(panel?.querySelectorAll('.chip').length).toBe(3);
    expect(panel?.textContent).toContain('17');
    expect(more?.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelectorAll('.day__tasks .chip').length).toBe(1);
  });
});
