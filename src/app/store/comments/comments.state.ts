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
