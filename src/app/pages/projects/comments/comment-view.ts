import { CommentReferenceModel } from '../../../core/models/comments';
import { WorkItemKind } from '../../../core/models/work-items';
import { MentionPerson } from '../../../core/utils/comment-editor.utils';
import { workItemRoute } from '../../../core/utils/work-item-route.utils';

/** A `#41` the reader can open, ready for the template: its kind and the page it leads to. */
export interface CommentReferenceView {
  reference: CommentReferenceModel;
  kind: WorkItemKind;
  route: string[];
}

/** What the inline tokens look up: people by id and work by code, both sent with the comment. */
export interface CommentLookups {
  people: ReadonlyMap<string, MentionPerson>;
  references: ReadonlyMap<string, CommentReferenceView>;
}

export function commentLookups(
  mentions: readonly MentionPerson[],
  references: readonly CommentReferenceModel[],
): CommentLookups {
  return {
    people: new Map(mentions.map((person) => [person.id.toLowerCase(), person])),
    references: new Map(
      references.map((reference) => [
        reference.code,
        { reference, kind: referenceKind(reference), route: workItemRoute(reference.ref) },
      ]),
    ),
  };
}

function referenceKind(reference: CommentReferenceModel): WorkItemKind {
  if (reference.type === 'project') return WorkItemKind.Project;
  if (reference.type === 'ticket') return WorkItemKind.Ticket;
  return reference.isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task;
}
