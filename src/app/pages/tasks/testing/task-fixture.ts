import { WorkTaskModel } from '../../../core/models/work-tasks';

export function taskFixture(overrides: Partial<WorkTaskModel> = {}): WorkTaskModel {
  return {
    id: 'task-1',
    code: '34',
    title: 'Integrate payment gateway',
    workProjectId: 'project-1',
    workProject: { id: 'project-1', code: '12', name: 'Payment Gateway Integration' },
    workTicket: { id: 'ticket-1', code: '28', name: 'Build a reliable payment service' },
    groupId: 'group-1',
    groupTitle: 'Delivery',
    milestoneId: 'milestone-1',
    milestoneTitle: 'Launch',
    isSubtask: false,
    subtaskCount: 5,
    doneSubtaskCount: 2,
    status: { id: 1, code: 'New', name: 'New' },
    priority: { id: 3, code: 'High', name: 'High' },
    assignee: { id: 'person-1', name: 'Roman', surname: 'Kovalchenko' },
    deadline: '2026-09-24T00:00:00Z',
    ...overrides,
  };
}
