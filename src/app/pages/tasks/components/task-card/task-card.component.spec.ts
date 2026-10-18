import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { taskFixture } from '../../testing/task-fixture';
import { TaskCardComponent } from './task-card.component';

import { translocoTestingProviders } from '../../../../core/testing/transloco-testing';
describe('TaskCardComponent', () => {
  function render(isSubtask = false) {
    TestBed.configureTestingModule({
      imports: [TaskCardComponent],
      providers: [...translocoTestingProviders(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(TaskCardComponent);
    fixture.componentRef.setInput('task', taskFixture({ isSubtask }));
    fixture.detectChanges();
    return fixture;
  }

  it.each([false, true])(
    'shows subtask progress only on a parent task (subtask=%s)',
    (isSubtask) => {
      const progress: HTMLElement | null = render(isSubtask).nativeElement.querySelector(
        '.card__progress',
      );
      expect(Boolean(progress)).toBe(!isSubtask);
      if (progress) expect(progress.textContent).toContain('2/5');
    },
  );

  it('makes the title a link to the task, so the card opens in a new tab too', () => {
    const title: HTMLAnchorElement = render().nativeElement.querySelector('a.card__title');

    expect(title.getAttribute('href')).toBe('/projects/project-1/tickets/ticket-1/tasks/task-1');
    expect(title.textContent).toContain('Integrate payment gateway');
  });

  it('opens in the app on a plain click and leaves ctrl+click to the browser', () => {
    const title: HTMLAnchorElement = render().nativeElement.querySelector('a.card__title');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    title.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(navigate).not.toHaveBeenCalled();

    title.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(navigate).toHaveBeenCalledOnce();
  });

  it('keeps one tab stop for the card: the link, not the card itself', () => {
    const card: HTMLElement = render().nativeElement.querySelector('.card');

    expect(card.hasAttribute('tabindex')).toBe(false);
    expect(card.getAttribute('role')).toBeNull();
  });
});
