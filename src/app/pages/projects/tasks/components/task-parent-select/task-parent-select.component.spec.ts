import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import { WorkTaskPageModel } from '../../../../../core/models/work-tasks';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { TaskParentSelectComponent } from './task-parent-select.component';
import { ticketParentOption } from './task-parent-option';

const ticket: WorkTicketModel = {
  id: 't',
  code: '1',
  title: 'Ticket',
  workProjectId: 'p',
  groupId: 'g',
  groupTitle: 'Group',
  milestoneId: 'm',
  milestoneTitle: 'Milestone',
  priority: { id: 1, name: 'Low', code: 'Low' },
  workTicketType: { id: 1, name: 'Bug', code: 'Bug' },
  workTicketStatus: { id: 1, name: 'New', code: 'New' },
};
async function setup(subtasks = false) {
  const tickets = {
    getWorkTickets: vi
      .fn()
      .mockReturnValue(of({ items: [ticket], hasMore: true, nextCursor: 'next' })),
  };
  const tasks = {
    getWorkTasks: vi.fn().mockReturnValue(of({ items: [], hasMore: false, nextCursor: null })),
  };
  TestBed.configureTestingModule({
    imports: [TaskParentSelectComponent],
    providers: [
      { provide: WorkTicketsService, useValue: tickets },
      { provide: WorkTasksService, useValue: tasks },
    ],
  }).overrideComponent(TaskParentSelectComponent, { set: { template: '' } });
  const fixture = TestBed.createComponent(TaskParentSelectComponent);
  fixture.componentRef.setInput('projectId', 'p');
  fixture.componentRef.setInput('ticketId', 't');
  fixture.componentRef.setInput('isSubtask', subtasks);
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, component: fixture.componentInstance, tickets, tasks };
}

describe('TaskParentSelectComponent', () => {
  it('preserves the selected item and deduplicates it after loading a page', async () => {
    const { component, fixture } = await setup();
    fixture.componentRef.setInput('selection', ticketParentOption(ticket));
    fixture.detectChanges();
    expect(component.groups().flatMap((group) => group.items)).toHaveLength(1);
  });

  it('loads the next cursor without discarding the previous page', async () => {
    const { component, tickets } = await setup();
    tickets.getWorkTickets.mockReturnValue(
      of({
        items: [{ ...ticket, id: 'second' }],
        hasMore: false,
        nextCursor: null,
      }),
    );
    component.loadMore(new Event('click'));
    expect(tickets.getWorkTickets).toHaveBeenLastCalledWith('p', { pageSize: 50, cursor: 'next' });
    expect(component.options()).toHaveLength(2);
    expect(component.hasMore()).toBe(false);
  });

  it('loads every top-level task in the project, not just the current ticket', async () => {
    // A subtask can be re-parented across the whole plan, so the list must not be ticket-scoped.
    const { tasks, tickets } = await setup(true);
    expect(tasks.getWorkTasks).toHaveBeenCalledWith('p', {
      rootTasksOnly: true,
      pageSize: 50,
      cursor: null,
    });
    expect(tickets.getWorkTickets).not.toHaveBeenCalled();
  });

  it('ignores an old response after the ticket changes', async () => {
    const { component, tasks, fixture } = await setup(true);
    const oldPage = new Subject<WorkTaskPageModel>();
    tasks.getWorkTasks.mockReturnValueOnce(oldPage).mockReturnValue(
      of({
        items: [],
        hasMore: false,
        nextCursor: null,
      }),
    );
    component.retryLoad(new Event('click'));
    fixture.componentRef.setInput('ticketId', 'other-ticket');
    fixture.detectChanges();
    await fixture.whenStable();
    oldPage.next({ items: [], hasMore: true, nextCursor: 'stale', pageSize: 50 });
    expect(component.hasMore()).toBe(false);
  });

  it('shows a load error and allows retry', async () => {
    const { component, tickets } = await setup();
    tickets.getWorkTickets.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.loadMore(new Event('click'));
    expect(component.loadError()).toBe(true);
    component.retryLoad(new Event('click'));
    expect(component.loadError()).toBe(false);
    expect(component.options()).toHaveLength(1);
  });

  it('does not emit choices while disabled', async () => {
    const { component, fixture } = await setup();
    const selected = vi.fn();
    component.selected.subscribe(selected);
    fixture.componentRef.setInput('disabled', true);
    component.choose(ticket.id);
    expect(selected).not.toHaveBeenCalled();
  });
});
