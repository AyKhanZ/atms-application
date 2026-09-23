import { TestBed } from '@angular/core/testing';
import { taskFixture } from '../../testing/task-fixture';
import { TaskListRowComponent } from './task-list-row.component';

describe('TaskListRowComponent', () => {
  function render(task = taskFixture()) {
    TestBed.configureTestingModule({ imports: [TaskListRowComponent] });
    const fixture = TestBed.createComponent(TaskListRowComponent);
    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the code and title on top, status, priority, date and person below', () => {
    const element: HTMLElement = render().nativeElement;

    expect(element.querySelector('.row__head')?.textContent).toContain('#34');
    expect(element.querySelector('.row__title')?.textContent).toContain('Integrate payment gateway');
    expect(element.querySelector('.row__meta app-task-status-badge')).not.toBeNull();
    expect(element.querySelector('.row__meta app-work-item-priority')).not.toBeNull();
    expect(element.querySelector('.row__deadline')).not.toBeNull();
  });

  it('shows the overdue pill instead of the date for overdue work', () => {
    const element: HTMLElement = render(
      taskFixture({ deadline: '2020-01-01T00:00:00Z' }),
    ).nativeElement;

    expect(element.querySelector('.row--overdue')).not.toBeNull();
    expect(element.querySelector('app-overdue-badge')).not.toBeNull();
    expect(element.querySelector('.row__deadline')).toBeNull();
  });
});
