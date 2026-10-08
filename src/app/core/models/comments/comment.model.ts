import { PersonModel } from '../person.model';
import { CommentReferenceModel } from './comment-reference.model';

export interface CommentModel {
  id: string;
  text: string;
  createdAt: string;
  createdBy: PersonModel;
  // null if never edited
  updatedAt: string | null;
  // deleted = placeholder, no text
  isDeleted: boolean;
  deletedAt: string | null;
  // null until the server sends it, right after a delete on this screen
  deletedBy: PersonModel | null;
  canEdit: boolean;
  canDelete: boolean;
  // people from @[user:id] in the text
  mentions: PersonModel[];
  references: CommentReferenceModel[];
}
