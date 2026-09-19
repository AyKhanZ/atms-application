import { GlobalSearchItemModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';

/**
 * Where a result opens. A subtask lives under its parent task's ticket, so it uses the same
 * route as a task — the page tells the two apart by the item itself.
 */
export function workItemRoute(item: GlobalSearchItemModel): string {
  const project = `/projects/${item.project.id}`;

  switch (item.itemType) {
    case WorkItemKind.Project:
      return project;
    case WorkItemKind.Ticket:
      return `${project}/tickets/${item.id}`;
    default:
      return `${project}/tickets/${item.ticket?.id}/tasks/${item.id}`;
  }
}

/** A code is matched exactly, so one digit is enough; a title needs three, like on the server. */
export function isSearchable(value: string): boolean {
  const text = value.trim();
  if (text.length === 0 || text.length > 100) return false;

  const code = text.replace(/^#+/, '').trim();
  if (code.length > 0 && /^\d+$/.test(code)) return true;

  return text.length >= 3 && !text.startsWith('#');
}
