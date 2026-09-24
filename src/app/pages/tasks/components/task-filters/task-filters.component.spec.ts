import { TestBed } from '@angular/core/testing';
import { emptyWorkTaskBoardFilter } from '../../../../core/models/work-task-board';
import { TaskFiltersComponent } from './task-filters.component';

describe('TaskFiltersComponent', () => {
  it('disables only No deadline in Calendar and keeps Overdue available', () => {
    TestBed.configureTestingModule({ imports: [TaskFiltersComponent] });
    const fixture = TestBed.createComponent(TaskFiltersComponent);
    fixture.componentRef.setInput('filter', emptyWorkTaskBoardFilter);
    fixture.componentRef.setInput('calendar', true);
    fixture.detectChanges();
    expect(
      fixture.componentInstance.deadlines().find((option) => option.value === 'none')?.disabled,
    ).toBe(true);
    expect(
      fixture.componentInstance.deadlines().find((option) => option.value === 'overdue')?.disabled,
    ).not.toBe(true);
    fixture.componentRef.setInput('calendar', false);
    expect(
      fixture.componentInstance.deadlines().find((option) => option.value === 'none')?.disabled,
    ).toBe(false);
  });
});
