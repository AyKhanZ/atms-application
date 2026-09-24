import { AttachmentModel, AttachmentTreeModel } from '../../../core/models/attachments';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { WorkItemKind } from '../../../core/models/work-items';
import { AttachmentTreeNode } from './attachment-tree-node';

export interface TicketFiles {
  items: AttachmentModel[];
  loading: boolean;
  error: string | null;
}

const byCode = (left: AttachmentTreeNode, right: AttachmentTreeNode) =>
  (left.code ?? '').localeCompare(right.code ?? '', undefined, { numeric: true });

const itemKinds: Record<AttachmentTreeNode['kind'], WorkItemKind | null> = {
  group: null,
  milestone: null,
  ticket: WorkItemKind.Ticket,
  task: WorkItemKind.Task,
  subtask: WorkItemKind.Subtask,
};

function node(
  kind: AttachmentTreeNode['kind'],
  ref: { id: string; code?: string | null; title: string },
  link: string[] | null,
): AttachmentTreeNode {
  return {
    key: `${kind}:${ref.id}`,
    kind,
    id: ref.id,
    code: ref.code ?? null,
    title: ref.title,
    itemKind: itemKinds[kind],
    fileCount: 0,
    files: [],
    children: [],
    link,
    lazy: false,
    loading: false,
    error: false,
  };
}

function withCounts(nodes: AttachmentTreeNode[]): AttachmentTreeNode[] {
  return nodes.sort(byCode).map((item) => {
    const children = withCounts(item.children);
    return {
      ...item,
      children,
      fileCount: item.files.length + children.reduce((sum, child) => sum + child.fileCount, 0),
    };
  });
}

/**
 * Tasks of one ticket, each with its own files and its subtasks under it. Files keep the order
 * they came in — newest first — and tasks go by code, the order the ticket lists them in.
 */
export function buildTaskNodes(
  items: readonly AttachmentModel[],
  projectId: string,
  ticketId: string,
): AttachmentTreeNode[] {
  const taskLink = (taskId: string) => ['/projects', projectId, 'tickets', ticketId, 'tasks', taskId];
  const tasks = new Map<string, AttachmentTreeNode>();
  const subtasks = new Map<string, AttachmentTreeNode>();

  const task = (ref: DictionaryModel<string>) => {
    let found = tasks.get(ref.id);
    if (!found) {
      found = node('task', { id: ref.id, code: ref.code, title: ref.name }, taskLink(ref.id));
      tasks.set(ref.id, found);
    }
    return found;
  };

  for (const item of items) {
    if (!item.parentWorkTask) {
      task(item.workTask).files.push(item);
      continue;
    }

    let subtask = subtasks.get(item.workTask.id);
    if (!subtask) {
      const ref = item.workTask;
      subtask = node('subtask', { id: ref.id, code: ref.code, title: ref.name }, taskLink(ref.id));
      subtasks.set(ref.id, subtask);
      task(item.parentWorkTask).children.push(subtask);
    }
    subtask.files.push(item);
  }

  return withCounts([...tasks.values()]);
}

/**
 * Groups, milestones and tickets of a project; a ticket's tasks appear once its files are read.
 *
 * The plan counts are a snapshot from when the tree was read. Once a ticket's files arrive they
 * are the fresher truth — someone may have added a file in between — so the ticket counts them
 * itself and every level above sums its children, and no branch says 7 over a child that says 8.
 */
export function buildProjectNodes(
  tree: AttachmentTreeModel,
  ticketFiles: (ticketId: string) => TicketFiles | undefined,
  projectId: string,
): AttachmentTreeNode[] {
  const sum = (nodes: AttachmentTreeNode[]) => nodes.reduce((total, item) => total + item.fileCount, 0);

  return tree.groups.map((group) => {
    const milestones = group.milestones.map((milestone) => {
      const tickets = milestone.tickets.map(({ workTicket, fileCount }) => {
        const files = ticketFiles(workTicket.id);
        const loaded = !!files && !files.loading && !files.error;
        const children = files ? buildTaskNodes(files.items, projectId, workTicket.id) : [];
        return {
          ...node(
            'ticket',
            { id: workTicket.id, code: workTicket.code, title: workTicket.name },
            ['/projects', projectId, 'tickets', workTicket.id],
          ),
          fileCount: loaded ? sum(children) : fileCount,
          lazy: true,
          loading: !files || (files.loading && files.items.length === 0),
          error: !!files?.error && files.items.length === 0,
          children,
        };
      });
      return { ...node('milestone', milestone, null), fileCount: sum(tickets), children: tickets };
    });
    return { ...node('group', group, null), fileCount: sum(milestones), children: milestones };
  });
}

/** Every node key, depth first — for Expand all. */
export function nodeKeys(nodes: readonly AttachmentTreeNode[]): string[] {
  return nodes.flatMap((item) => [item.key, ...nodeKeys(item.children)]);
}

export function countFiles(nodes: readonly AttachmentTreeNode[]): number {
  return nodes.reduce((sum, item) => sum + item.fileCount, 0);
}
