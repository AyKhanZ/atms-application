import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { taskFixture } from '../../testing/task-fixture';
import { TaskContextComponent } from './task-context.component';

describe('TaskContextComponent', () => {
  it.each([false, true])('links to the actual parent (subtask=%s)', (isSubtask) => {
    TestBed.configureTestingModule({
      imports: [TaskContextComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(TaskContextComponent);
    fixture.componentRef.setInput(
      'task',
      taskFixture({
        isSubtask,
        parentWorkTask: isSubtask
          ? { id: 'parent-1', code: '22', name: 'Parent task title' }
          : null,
      }),
    );
    fixture.detectChanges();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.parent');
    expect(link.getAttribute('href')).toBe(
      '/projects/project-1/tickets/ticket-1' + (isSubtask ? '/tasks/parent-1' : ''),
    );
    // One line: icon, code and name; the whole name also in the tooltip.
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      isSubtask ? '#22 Parent task title' : '#28 Build a reliable payment service',
    );
    expect(link.title).toBe(isSubtask ? 'Parent task title' : 'Build a reliable payment service');
    expect(fixture.nativeElement.querySelector('app-work-item-ref').getAttribute('data-kind')).toBe(
      isSubtask ? 'task' : 'ticket',
    );
    expect(fixture.nativeElement.querySelector('.link--project')).toBeNull();
  });

  it('names the project above the parent when the page mixes several', () => {
    TestBed.configureTestingModule({
      imports: [TaskContextComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(TaskContextComponent);
    fixture.componentRef.setInput('task', taskFixture());
    fixture.componentRef.setInput('showProject', true);
    fixture.detectChanges();

    const project: HTMLAnchorElement = fixture.nativeElement.querySelector('.link--project');
    expect(project.getAttribute('href')).toBe('/projects/project-1');
    expect(project.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '#12 Payment Gateway Integration',
    );
  });
});
