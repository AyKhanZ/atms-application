import { CommentModel } from './comment.model';

export interface CommentPageModel {
  items: CommentModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
