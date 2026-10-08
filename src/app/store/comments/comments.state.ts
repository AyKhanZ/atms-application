import { CommentModel } from '../../core/models/comments';

export interface CommentListState {
  projectId: string;
  workTaskId: string;
  // newest first
  items: CommentModel[];
  nextCursor: string | null;
  hasMore: boolean;
  // first page
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  // deleted while open, a read that started before must not show the text again
  removedIds: string[];
  // shown above the list until a page brings it to its place
  linked: CommentModel | null;
  // an answer for an earlier link is dropped
  linkedId: string | null;
  linkedError: string | null;
}

export interface CommentsState {
  // task:<id>
  lists: Record<string, CommentListState>;
}

export const initialCommentsState: CommentsState = {
  lists: {},
};

export function commentsKey(workTaskId: string): string {
  return `task:${workTaskId}`;
}
