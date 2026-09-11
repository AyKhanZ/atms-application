import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { taskParentOption, ticketParentOption } from '../task-parent-select/task-parent-option';
import { TaskFormBreadcrumbsService } from './task-form-breadcrumbs.service';
import { TaskFormContextService } from './task-form-context.service';
import { TaskFormPageComponent } from './task-form-page.component';

const dictionary = { id: 1, name: 'New', code: 'New' };
const project: WorkProjectModel = {
  id: 'p',
  code: '1',
  title: 'Project',
  projectType: dictionary,
  projectKind: dictionary,
  projectStatus: dictionary,
  participants: [],
  createdAt: '',
};
const ticket: WorkTicketModel = {
  id: 'ticket-a',
  code: '1',
  title: 'Ticket A',
  workProjectId: 'p',
  groupId: 'g',
  groupTitle: 'Group',
  milestoneId: 'm',
  milestoneTitle: 'Milestone',
  workTicketType: dictionary,
  workTicketStatus: dictionary,
  priority: dictionary,
};
const task: WorkTaskModel = {
  id: 'parent-a',
  code: '2',
  title: 'Parent A',
  workProjectId: 'p',
  workTicketId: ticket.id,
  workTicketCode: ticket.code,
  workTicketTitle: ticket.title,
  groupId: 'g',
  groupTitle: 'Group',
  milestoneId: 'm',
  milestoneTitle: 'Milestone',
  isSubtask: false,
  status: dictionary,
  priority: dictionary,
  subtaskCount: 0,
  doneSubtaskCount: 0,
};

async function setup(mode: 'create' | 'edit' = 'create', parent = false, loadedTask = task) {
  history.replaceState({ returnUrl: '/projects/p/tickets/ticket-a?tab=tasks' }, '');
  const api = {
    createWorkTask: vi.fn().mockReturnValue(of('created')),
    updateWorkTask: vi.fn().mockReturnValue(of(undefined)),
  };
  const router = {
    navigate: vi.fn().mockResolvedValue(true),
    navigateByUrl: vi.fn().mockResolvedValue(true),
  };
  const breadcrumbs = { show: vi.fn(), placeholder: vi.fn() };
  TestBed.configureTestingModule({
    imports: [TaskFormPageComponent],
    providers: [
      ConfirmationService,
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({
              projectId: 'p',
              ticketId: ticket.id,
              ...(mode === 'edit' ? { taskId: task.id } : {}),
            }),
            queryParamMap: convertToParamMap(parent ? { parentTaskId: task.id } : {}),
          },
        },
      },
      { provide: WorkTasksService, useValue: api },
      { provide: SnackBarService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).overrideComponent(TaskFormPageComponent, {
    set: {
      template: '',
      providers: [
        {
          provide: TaskFormContextService,
          useValue: {
            load: () =>
              of({
                project,
                priorities: [dictionary],
                statuses: [dictionary],
                ticket: parent || mode === 'edit' ? null : ticket,
                task: parent || mode === 'edit' ? loadedTask : null,
              }),
          },
        },
        { provide: TaskFormBreadcrumbsService, useValue: breadcrumbs },
      ],
    },
  });
  const fixture = TestBed.createComponent(TaskFormPageComponent);
  fixture.componentRef.setInput('mode', mode);
  fixture.detectChanges();
  fixture.componentInstance.form.patchValue({ title: 'Task name', priorityId: 1 });
  return { fixture, page: fixture.componentInstance, api, router, breadcrumbs };
}

describe('TaskFormPageComponent parent selection', () => {
  afterEach(() => history.replaceState(null, ''));

  it('sends the selected ticket and navigates to the created task, ignoring the old return URL', async () => {
    const { page, api, router, breadcrumbs } = await setup();
    const selected = ticketParentOption({
      ...ticket,
      id: 'ticket-b',
      code: '3',
      title: 'Ticket B',
    });
    page.selectParent(selected);
    expect(page.form.controls.title.value).toBe('Task name');
    expect(page.hasUnsavedChanges()).toBe(true);
    expect(breadcrumbs.show).toHaveBeenLastCalledWith(project, selected, null);
    page.submit();
    expect(api.createWorkTask).toHaveBeenCalledWith(
      'p',
      expect.objectContaining({
        workTicketId: 'ticket-b',
        parentWorkTaskId: null,
      }),
    );
    expect(router.navigate).toHaveBeenCalledWith([
      '/projects',
      'p',
      'tickets',
      'ticket-b',
      'tasks',
      'created',
    ]);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(page.hasUnsavedChanges()).toBe(false);
  });

  it('sends the newly selected top-level parent for a subtask', async () => {
    const { page, api } = await setup('create', true);
    page.selectParent(taskParentOption({ ...task, id: 'parent-b' }));
    page.submit();
    expect(api.createWorkTask).toHaveBeenCalledWith(
      'p',
      expect.objectContaining({
        workTicketId: ticket.id,
        parentWorkTaskId: 'parent-b',
      }),
    );
  });

  it('accepts a parent from another ticket and follows it', async () => {
    // A subtask can be re-parented anywhere in the project, and it takes its new parent's ticket.
    const { page } = await setup('create', true);
    page.selectParent(taskParentOption({ ...task, id: 'other', workTicketId: 'ticket-b' }));
    expect(page.form.controls.parentWorkTaskId.value).toBe('other');
    expect(page.form.controls.workTicketId.value).toBe('ticket-b');
  });

  it('rejects a ticket while choosing a parent for a subtask', async () => {
    const { page } = await setup('create', true);
    page.selectParent(ticketParentOption(ticket));
    expect(page.form.controls.parentWorkTaskId.value).toBe(task.id);
  });

  it('cannot create a subtask when the parent is missing', async () => {
    const { page, api } = await setup('create', true);
    page.form.controls.parentWorkTaskId.setValue(null);
    page.submit();
    expect(api.createWorkTask).not.toHaveBeenCalled();
  });

  it('blocks a subtask being used as an initial parent', async () => {
    const { page, api } = await setup('create', true, {
      ...task,
      isSubtask: true,
      parentWorkTaskId: 'root',
    });
    page.submit();
    expect(page.loadError()).toBeTruthy();
    expect(api.createWorkTask).not.toHaveBeenCalled();
  });

  it('moves the task to the chosen ticket on update', async () => {
    const { page, api } = await setup('edit');
    page.selectParent(ticketParentOption({ ...ticket, id: 'ticket-b' }));
    page.submit();
    expect(page.form.controls.workTicketId.value).toBe('ticket-b');
    expect(api.updateWorkTask).toHaveBeenCalledWith(
      'p',
      task.id,
      expect.objectContaining({ workTicketId: 'ticket-b', parentWorkTaskId: null }),
    );
    expect(api.createWorkTask).not.toHaveBeenCalled();
  });

  it('keeps a subtask under its parent when nothing but the title is edited', async () => {
    // The edit form is opened without a parentTaskId query parameter, so the parent has to come
    // from the loaded task. Sending null here silently promotes the subtask to a top-level task.
    const subtask = {
      ...task,
      id: 'sub-a',
      isSubtask: true,
      parentWorkTaskId: 'parent-a',
      parentWorkTaskCode: '2',
      parentWorkTaskTitle: 'Parent A',
    };
    const { page, api } = await setup('edit', false, subtask);
    page.form.patchValue({ statusId: 1 });
    page.submit();
    expect(api.updateWorkTask).toHaveBeenCalledWith(
      'p',
      task.id,
      expect.objectContaining({ parentWorkTaskId: 'parent-a', workTicketId: ticket.id }),
    );
  });
  it('follows a task that has moved to another ticket instead of failing', async () => {
    // The details page redirects in this situation; a link kept from before the move used to
    // dead-end here with a "does not belong to this ticket" error.
    const moved = { ...task, workTicketId: 'ticket-b' };
    const { page, router } = await setup('edit', false, moved);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/projects', 'p', 'tickets', 'ticket-b', 'tasks', task.id, 'edit'],
      expect.objectContaining({ replaceUrl: true }),
    );
    expect(page.loadError()).toBeNull();
  });
});
