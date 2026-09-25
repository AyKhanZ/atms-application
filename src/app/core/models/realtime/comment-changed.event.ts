export interface CommentChangedEvent {
  workTaskId: string;
  commentId: string;
  parentCommentId: string | null;
  action: 'created' | 'updated' | 'deleted';
}
