import { TestBed } from '@angular/core/testing';
import { taskFixture } from '../../testing/task-fixture';
import { TaskCalendarChipComponent } from './task-calendar-chip.component';

describe('TaskCalendarChipComponent', () => {
  function render(inputs: Record<string, unknown>) {
    TestBed.configureTestingModule({ imports: [TaskCalendarChipComponent] });
    const fixture = TestBed.createComponent(TaskCalendarChipComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture;
  }

  it('is one line on the grid: title and avatar, the code left to the hover card', () => {
    const element: HTMLElement = render({ task: taskFixture() }).nativeElement;

    expect(element.querySelector('app-work-item-ref')).toBeNull();
    expect(element.querySelector('.chip__title')?.textContent).toContain('Integrate payment gateway');
    expect(element.querySelector('app-work-item-assignee')).not.toBeNull();
  });

  it('shows the code in the phone agenda', () => {
    const element: HTMLElement = render({ task: taskFixture(), phone: true }).nativeElement;

    expect(element.querySelector('.chip--phone app-work-item-ref')).not.toBeNull();
  });

  it('marks overdue work with a compact pill and hides the avatar when asked', () => {
    const element: HTMLElement = render({
      task: taskFixture({ deadline: '2020-01-01T00:00:00Z' }),
      hideAssignee: true,
    }).nativeElement;

    expect(element.querySelector('.chip--overdue')).not.toBeNull();
    expect(element.querySelector('app-overdue-badge.is-compact')).not.toBeNull();
    expect(element.querySelector('app-work-item-assignee')).toBeNull();
  });

  it('opens the task on click', () => {
    const fixture = render({ task: taskFixture() });
    const open = vi.spyOn(fixture.componentInstance.open, 'emit');

    fixture.nativeElement.querySelector('button').click();

    expect(open).toHaveBeenCalled();
  });
});
