import { AttachmentModel } from '../../../core/models/attachments';
import { WorkItemKind } from '../../../core/models/work-items';

export type AttachmentNodeKind = 'group' | 'milestone' | 'ticket' | 'task' | 'subtask';

export interface AttachmentTreeNode {
  // task:<id>
  key: string;
  kind: AttachmentNodeKind;
  id: string;
  code: string | null;
  title: string;
  // groups and milestones have no code
  itemKind: WorkItemKind | null;
  // this node and everything below
  fileCount: number;
  files: AttachmentModel[];
  children: AttachmentTreeNode[];
  // groups and milestones have no page
  link: string[] | null;
  // ticket files are loaded when opened
  lazy: boolean;
  loading: boolean;
  error: boolean;
}
