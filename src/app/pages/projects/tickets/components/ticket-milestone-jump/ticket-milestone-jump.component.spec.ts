import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { sortTicketsByCode } from './ticket-milestone-jump.component';

describe('TicketMilestoneJumpComponent', () => {
  it('orders tickets by descending numeric code without mutating the source', () => {
    const tickets = [ticket('7'), ticket('29'), ticket('12')];

    const result = sortTicketsByCode(tickets);

    expect(result.map((item) => item.code)).toEqual(['29', '12', '7']);
    expect(tickets.map((item) => item.code)).toEqual(['7', '29', '12']);
  });
});

function ticket(code: string): WorkTicketModel {
  return {
    id: `ticket-${code}`,
    code,
    title: `Ticket ${code}`,
    workProjectId: 'project-1',
    groupId: 'group-1',
    groupTitle: 'Group',
    milestoneId: 'milestone-1',
    milestoneTitle: 'Milestone',
    workTicketType: { id: 1, code: 'Feature', name: 'Feature' },
    workTicketStatus: { id: 1, code: 'New', name: 'New' },
    priority: { id: 1, code: 'Medium', name: 'Medium' },
  };
}
