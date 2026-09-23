import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { emptyWorkTaskBoardFilter } from '../../../../core/models/work-task-board';
import { TaskBoardStoreActions, TaskBoardStoreSelectors } from '../../../../store/task-board';
import { TaskCalendarViewComponent } from './task-calendar-view.component';

describe('TaskCalendarViewComponent', () => {
  it('loads only the visible month and preserves the Overdue filter without an undated count request', () => {
    const dispatch = vi.fn();
    TestBed.configureTestingModule({
      imports: [TaskCalendarViewComponent],
      providers: [
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
