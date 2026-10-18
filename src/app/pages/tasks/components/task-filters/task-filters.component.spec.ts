import { TestBed } from '@angular/core/testing';
import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
import { emptyWorkTaskBoardFilter } from '../../../../core/models/work-task-board';
import { TaskFiltersComponent } from './task-filters.component';

describe('TaskFiltersComponent', () => {
  it('disables only No deadline in Calendar and keeps Overdue available', () => {
    TestBed.configureTestingModule({
      imports: [TaskFiltersComponent],
      providers: [...translocoTestingProviders()],
    });
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

  it('has no Status field on the board, and a status picked in the list does not count there', () => {
    TestBed.configureTestingModule({
      imports: [TaskFiltersComponent],
      providers: [...translocoTestingProviders()],
    });
    const fixture = TestBed.createComponent(TaskFiltersComponent);
    fixture.componentRef.setInput('filter', { ...emptyWorkTaskBoardFilter, statusIds: [1] });
    fixture.componentRef.setInput('board', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#taskFilterStateLabel')).toBeNull();
    expect(fixture.componentInstance.canClear()).toBe(false);

    fixture.componentRef.setInput('board', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#taskFilterStateLabel')).not.toBeNull();
    expect(fixture.componentInstance.canClear()).toBe(true);
  });
});
