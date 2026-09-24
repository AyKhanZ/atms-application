import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { Store, provideStore } from '@ngrx/store';
import { NEVER, of } from 'rxjs';
import { WorkTasksStoreActions } from '../../../../../store/work-tasks';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { WorkTaskListComponent } from './work-task-list.component';
import { Features } from '../../../../../store/features.enum';
import { WorkTasksEffects } from '../../../../../store/work-tasks/work-tasks.effects';
import { workTasksReducer } from '../../../../../store/work-tasks/work-tasks.reducer';

const task: WorkTaskModel = {
  id: 'a',
  code: '4',
  title: 'Task',
  workProjectId: 'p',
  workTicket: { id: 't', code: '2', name: 'Ticket' },
  groupId: 'g',
  groupTitle: 'Group',
  milestoneId: 'm',
  milestoneTitle: 'Milestone',
  isSubtask: false,
  priority: { id: 1, code: 'Low', name: 'Low' },
  status: { id: 1, code: 'New', name: 'New' },
  subtaskCount: 0,
  doneSubtaskCount: 0,
};

async function setup(canEdit: boolean) {
  const navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    imports: [WorkTaskListComponent],
    providers: [
      { provide: Router, useValue: { navigate, url: '/projects/p/tickets/t?tab=tasks' } },
      provideStore({ [Features.WorkTasks]: workTasksReducer }),
      provideEffects(WorkTasksEffects),
      {
        provide: WorkTasksService,
        useValue: {
          getWorkTasks: () =>
            of({
              items: [task],
              hasMore: false,
              nextCursor: null,
              pageSize: 10,
            }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(WorkTaskListComponent);
  fixture.componentRef.setInput('projectId', 'p');
  fixture.componentRef.setInput('ticketId', 't');
  fixture.componentRef.setInput('canEdit', canEdit);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return {
    fixture,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
    navigate,
  };
}
describe('WorkTaskListComponent', () => {
  it.each([false, true])('shows only permitted edit options, canEdit=%s', async (canEdit) => {
    const { element, component } = await setup(canEdit);
    expect(element.querySelectorAll('.item-menu-button')).toHaveLength(canEdit ? 1 : 0);
    expect(element.querySelector('app-work-item-priority')).toBeNull();
    expect(element.querySelector('[aria-label="Delete task"]')).toBeNull();
    expect(element.querySelector('app-work-item-assignee')?.textContent).toContain('Unassigned');
    component.selectedTask.set(task);
    expect(component.taskActions().map((item) => item.label)).toEqual(canEdit ? ['Edit'] : []);
  });

  /* Loading the next page used to swap the rows for "Loading tasks..." and back, so the page
     collapsed and jumped. The rows stay and only the button spins. */
  it('keeps the rows on screen while the next page loads', async () => {
    const { fixture, element } = await setup(false);
    const service = TestBed.inject(WorkTasksService) as unknown as {
      getWorkTasks: () => unknown;
    };
    service.getWorkTasks = () => NEVER;

    TestBed.inject(Store).dispatch(
      WorkTasksStoreActions.loadTasks({
        requestKey: 'p|t|',
        projectId: 'p',
        filter: {},
        append: true,
      }),
    );
    fixture.detectChanges();

    expect(element.querySelectorAll('.task-row')).toHaveLength(1);
    expect(element.querySelector('.tasks-state')).toBeNull();
  });

  it('does not navigate to edit without permission', async () => {
    const { component, navigate } = await setup(false);
    component.edit(task);
    expect(navigate).not.toHaveBeenCalled();
  });
});
