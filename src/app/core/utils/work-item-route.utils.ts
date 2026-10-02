import { WorkItemRefModel } from '../models/work-items';

/** The page of a project, ticket or task, by the ids the dashboard and comments send with it. */
export function workItemRoute(ref: WorkItemRefModel): string[] {
  const route = ['/projects', ref.projectId];
  if (ref.workTicketId) route.push('tickets', ref.workTicketId);
  if (ref.workTaskId) route.push('tasks', ref.workTaskId);
  return route;
}
