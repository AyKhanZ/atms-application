import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { TaskLocationComponent } from './task-location.component';

function task(parentWorkTaskId?: string): WorkTaskModel {
  return {
    id: 'current',
    code: '10',
    title: 'Current task',
    workProjectId: 'project',
    workTicketId: 'ticket',
    workTicketCode: '1',
    workTicketTitle: 'Ticket',
    groupId: 'group',
    groupTitle: 'Group',
    milestoneId: 'milestone',
    milestoneTitle: 'Milestone',
    parentWorkTaskId,
    parentWorkTaskTitle: parentWorkTaskId ? 'Parent' : undefined,
    parentWorkTaskCode: parentWorkTaskId ? '9' : undefined,
    isSubtask: !!parentWorkTaskId,
    subtaskCount: 0,
    doneSubtaskCount: 0,
    priority: { id: 1, code: 'Low', name: 'Low' },
    status: { id: 1, code: 'New', name: 'New' },
  };
}

describe('TaskLocationComponent', () => {
  async function setup(parentId?: string, allowJump = true) {
    const getWorkTasks = vi.fn(() => of({ items: [], hasMore: false }));
    await TestBed.configureTestingModule({
      imports: [TaskLocationComponent],
      providers: [provideRouter([]), { provide: WorkTasksService, useValue: { getWorkTasks } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TaskLocationComponent);
    fixture.componentRef.setInput('task', task(parentId));
    fixture.componentRef.setInput('allowJump', allowJump);
    fixture.detectChanges();
    return { fixture, getWorkTasks };
  }

  it('requests only root tasks of its own ticket', async () => {
    const { getWorkTasks } = await setup();
    expect(getWorkTasks).toHaveBeenCalledWith('project', {
      workTicketId: 'ticket',
      rootTasksOnly: true,
      pageSize: 50,
      search: '',
      cursor: undefined,
    });
  });

  it('requests subtasks only by their common parent', async () => {
    const { fixture, getWorkTasks } = await setup('parent');
    expect(getWorkTasks).toHaveBeenCalledWith('project', {
      parentWorkTaskId: 'parent',
      pageSize: 50,
      search: '',
      cursor: undefined,
    });
    // The label is not printed any more — the trigger reads as a select on its own — so it is
    // only there for assistive technology.
    expect(
      fixture.nativeElement.querySelector('.work-item-jump-trigger')?.getAttribute('aria-label'),
    ).toBe('Switch subtask');
    expect(fixture.nativeElement.querySelector('.location-tree a')).toBeNull();
  });

  it('navigates to the selected sibling in the current ticket', async () => {
    const { fixture } = await setup('parent');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.selectSibling('sibling');
    // The sibling takes this page's place, so Back leads where the user came from.
    expect(navigate).toHaveBeenCalledWith(
      ['/projects', 'project', 'tickets', 'ticket', 'tasks', 'sibling'],
      { state: { replaceHistory: true } },
    );
  });

  it('keeps edit Location read-only without loading siblings', async () => {
    const { fixture, getWorkTasks } = await setup(undefined, false);
    expect(getWorkTasks).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-work-item-jump')).toBeNull();
  });

  it('reloads the sibling scope when the task input changes', async () => {
    const { fixture, getWorkTasks } = await setup();
    fixture.componentRef.setInput('task', task('another-parent'));
    fixture.detectChanges();
    expect(getWorkTasks).toHaveBeenLastCalledWith(
      'project',
      expect.objectContaining({ parentWorkTaskId: 'another-parent' }),
    );
  });
});
