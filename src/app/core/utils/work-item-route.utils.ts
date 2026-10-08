import { WorkItemRefModel } from '../models/work-items';

export function workItemRoute(ref: WorkItemRefModel): string[] {
  const route = ['/projects', ref.projectId];
  if (ref.workTicketId) route.push('tickets', ref.workTicketId);
  if (ref.workTaskId) route.push('tasks', ref.workTaskId);
  return route;
}
