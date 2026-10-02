import { PersonModel } from '../person.model';
import { CommentReferenceModel } from './comment-reference.model';

export interface CommentModel {
  id: string;
  text: string;
  createdAt: string;
  createdBy: PersonModel;
  /** Null while the comment was never edited. */
  updatedAt: string | null;
  /** A placeholder in its place: no text, only who deleted it and when. */
  isDeleted: boolean;
  deletedAt: string | null;
  /** Null until the server names them — just after a delete seen on this screen. */
  deletedBy: PersonModel | null;
  canEdit: boolean;
  canDelete: boolean;
  /** The people `@[user:id]` in the text points at, by their current names. */
  mentions: PersonModel[];
  references: CommentReferenceModel[];
}
