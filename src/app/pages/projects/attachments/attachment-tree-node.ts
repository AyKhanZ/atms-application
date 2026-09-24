import { AttachmentModel } from '../../../core/models/attachments';
import { WorkItemKind } from '../../../core/models/work-items';

export type AttachmentNodeKind = 'group' | 'milestone' | 'ticket' | 'task' | 'subtask';

/** One level of the plan in an attachments tree, with the files that hang on it. */
export interface AttachmentTreeNode {
  /** Unique across the tree: `task:<id>`. */
  key: string;
  kind: AttachmentNodeKind;
  id: string;
  code: string | null;
  title: string;
  /** How `app-work-item-ref` draws the code; groups and milestones have no code. */
  itemKind: WorkItemKind | null;
  /** Files of this node and of everything below it. */
  fileCount: number;
  files: AttachmentModel[];
  children: AttachmentTreeNode[];
  /** Router commands of the item's page; groups and milestones have none. */
  link: string[] | null;
  /** A ticket in the project tree: its files are read only when it is opened. */
  lazy: boolean;
  loading: boolean;
  error: boolean;
}
