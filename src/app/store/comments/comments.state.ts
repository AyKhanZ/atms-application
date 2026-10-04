import { CommentModel } from '../../core/models/comments';

export interface CommentListState {
  projectId: string;
  workTaskId: string;
  /** Newest first. */
  items: CommentModel[];
  nextCursor: string | null;
  hasMore: boolean;
  /** The first page. */
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  /**
   * Comments deleted while the list is open. A delete cannot be undone, so a read that started
   * before it and answers after it must not show its text again.
   */
  removedIds: string[];
  /**
   * The comment a link points at when no page read so far holds it: read alone and shown above the
   * list until a page brings it to its place. Pushes refresh it like any comment on screen.
   */
  linked: CommentModel | null;
  /** The comment the link asked for: read once, and an answer for an earlier link is dropped. */
  linkedId: string | null;
  linkedError: string | null;
}

export interface CommentsState {
  /** By list key: `task:<id>`. */
  lists: Record<string, CommentListState>;
}

export const initialCommentsState: CommentsState = {
  lists: {},
};

export function commentsKey(workTaskId: string): string {
  return `task:${workTaskId}`;
}
