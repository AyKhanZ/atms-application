import { PROJECTS_ROUTES } from './projects.routes';

describe('PROJECTS_ROUTES task hierarchy', () => {
  it('keeps task pages nested under their ticket', () => {
    const taskPaths = PROJECTS_ROUTES.map((route) => route.path).filter((path) =>
      path?.includes('tasks'),
    );

    expect(taskPaths).toEqual([
      ':projectId/tickets/:ticketId/tasks/create',
      ':projectId/tickets/:ticketId/tasks/:taskId/edit',
      ':projectId/tickets/:ticketId/tasks/:taskId',
    ]);
  });

  it('uses the task create route for both tasks and subtasks', () => {
    const taskCreatePaths = PROJECTS_ROUTES.filter((route) =>
      route.path?.endsWith('/tasks/create'),
    );

    expect(taskCreatePaths).toHaveLength(1);
  });
});
