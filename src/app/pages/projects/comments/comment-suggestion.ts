import { CommentReferenceModel } from '../../../core/models/comments';
import { GlobalSearchItemModel, GlobalSearchModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { MentionPerson } from '../../../core/utils/comment-editor.utils';
import { personFullName } from '../../../core/utils/person-name.utils';

/** Rows in the list under the editor: at most this many, as in 13-comments. */
export const SUGGESTION_LIMIT = 8;

export interface MentionCandidate extends MentionPerson {
  avatarPath?: string | null;
}

/** A row of the `@` or `#` list: a person to mention or work to link. */
export type CommentSuggestion =
  | { kind: 'person'; person: MentionCandidate }
  | { kind: 'work'; item: GlobalSearchItemModel };

/** People whose first or last name starts with what was typed; everyone for a bare `@`. */
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

/**
 * A work item picked after `#`, in the shape the server sends with a saved comment — so the preview
 * shows it as the same badge, not as a bare `#41`.
 */
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

/** Rows under `#`: projects, tickets, tasks and subtasks together. */
export const WORK_SUGGESTION_LIMIT = 10;

/** What the global search looks for: a code, or three letters of a title and more. */
export function isSearchable(query: string): boolean {
  return /^\d+$/.test(query) || query.length >= 3;
}

/**
 * The global search's answer as rows. A query too short to search filters the recently opened
 * items instead, so a letter or two still narrows the list rather than emptying it.
 */
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
