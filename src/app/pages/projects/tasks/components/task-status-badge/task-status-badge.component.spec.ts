import { TestBed } from '@angular/core/testing';
import { TaskStatusBadgeComponent, taskStatusTone } from './task-status-badge.component';

describe('taskStatusTone', () => {
  it.each([
    ['New', 'neutral'],
    ['InProgress', 'active'],
    ['inprogress', 'active'],
    ['Done', 'success'],
    [' done ', 'success'],
    ['Unknown', 'neutral'],
  ])('maps %s to %s', (code, expected) => {
    expect(taskStatusTone(code)).toBe(expected);
  });
});

describe('TaskStatusBadgeComponent', () => {
  const render = (inputs: { dotOnly?: boolean; muted?: boolean }) => {
    const fixture = TestBed.createComponent(TaskStatusBadgeComponent);
    fixture.componentRef.setInput('status', { id: 2, code: 'InProgress', name: 'In Progress' });
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.task-status') as HTMLElement;
  };

  it('keeps only the dot, and names the status for a reader', () => {
    const badge = render({ dotOnly: true });

    expect(badge.textContent?.trim()).toBe('');
    expect(badge.getAttribute('aria-label')).toBe('In Progress');
  });

  it('marks a replaced status', () => {
    expect(render({ muted: true }).classList).toContain('task-status--muted');
  });
});
