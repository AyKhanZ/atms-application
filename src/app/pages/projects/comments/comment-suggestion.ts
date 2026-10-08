import { CommentReferenceModel } from '../../../core/models/comments';
import { GlobalSearchItemModel, GlobalSearchModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { MentionPerson } from '../../../core/utils/comment-editor.utils';
import { personFullName } from '../../../core/utils/person-name.utils';

export const SUGGESTION_LIMIT = 8;

export interface MentionCandidate extends MentionPerson {
  avatarPath?: string | null;
}

export type CommentSuggestion =
  | { kind: 'person'; person: MentionCandidate }
  | { kind: 'work'; item: GlobalSearchItemModel };

// everyone for a bare @
export function personSuggestions(
  people: readonly MentionCandidate[],
  query: string,
): CommentSuggestion[] {
  const typed = query.trim().toLocaleLowerCase();
  return people
    .filter((person) => {
      if (!typed) return true;
      const name = personFullName(person, '').toLocaleLowerCase();
      return name.startsWith(typed) || name.split(/\s+/).some((part) => part.startsWith(typed));
    })
    .slice(0, SUGGESTION_LIMIT)
    .map((person) => ({ kind: 'person', person }));
}

// same shape as the server sends, so the preview shows the badge, not a bare #41
export function referenceOf(item: GlobalSearchItemModel): CommentReferenceModel {
  const base = { code: item.code, title: item.title, status: item.status, isSubtask: false };
  switch (item.itemType) {
    case WorkItemKind.Project:
      return {
        ...base,
        type: 'project',
        ref: { projectId: item.id, workTicketId: null, workTaskId: null },
      };
    case WorkItemKind.Ticket:
      return {
        ...base,
        type: 'ticket',
        ref: { projectId: item.project.id, workTicketId: item.id, workTaskId: null },
      };
    default:
      return {
        ...base,
        type: 'task',
        isSubtask: item.itemType === WorkItemKind.Subtask,
        ref: {
          projectId: item.project.id,
          workTicketId: item.ticket?.id ?? null,
          workTaskId: item.id,
        },
      };
  }
}

export const WORK_SUGGESTION_LIMIT = 10;

// a code or 3+ letters of a title
export function isSearchable(query: string): boolean {
  return /^\d+$/.test(query) || query.length >= 3;
}

// too short to search -> filter the recent items, so a letter still narrows the list
export function workSuggestions(result: GlobalSearchModel, query: string): CommentSuggestion[] {
  const typed = query.toLocaleLowerCase();
  const items = isSearchable(query)
    ? [
        ...result.projects.items,
        ...result.tickets.items,
        ...result.tasks.items,
        ...result.subtasks.items,
      ]
    : result.recent.filter(
        (item) => item.code.startsWith(typed) || item.title.toLocaleLowerCase().includes(typed),
      );
  return items.slice(0, WORK_SUGGESTION_LIMIT).map((item) => ({ kind: 'work', item }));
}
