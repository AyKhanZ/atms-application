import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { taskFixture } from '../../testing/task-fixture';
import { TaskCardComponent } from './task-card.component';

describe('TaskCardComponent', () => {
  it.each([false, true])(
    'shows subtask progress only on a parent task (subtask=%s)',
    (isSubtask) => {
      TestBed.configureTestingModule({
        imports: [TaskCardComponent],
        providers: [provideRouter([])],
      });
      const fixture = TestBed.createComponent(TaskCardComponent);
      fixture.componentRef.setInput('task', taskFixture({ isSubtask }));
      fixture.detectChanges();
      const progress: HTMLElement | null = fixture.nativeElement.querySelector('.card__progress');
      expect(Boolean(progress)).toBe(!isSubtask);
      if (progress) expect(progress.textContent).toContain('2/5');
    },
  );
});
