import { workItemRoute } from './work-item-route.utils';

describe('workItemRoute', () => {
  it('leads to a project, a ticket or a task', () => {
    expect(workItemRoute({ projectId: 'p', workTicketId: null, workTaskId: null })).toEqual([
      '/projects',
      'p',
    ]);
    expect(workItemRoute({ projectId: 'p', workTicketId: 't', workTaskId: null })).toEqual([
      '/projects',
      'p',
      'tickets',
      't',
    ]);
    expect(workItemRoute({ projectId: 'p', workTicketId: 't', workTaskId: 'k' })).toEqual([
      '/projects',
      'p',
      'tickets',
      't',
      'tasks',
      'k',
    ]);
  });
});
