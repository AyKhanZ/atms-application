export interface CommentChangedEvent {
  workTaskId: string;
  commentId: string;
  action: 'created' | 'updated' | 'deleted';
}
