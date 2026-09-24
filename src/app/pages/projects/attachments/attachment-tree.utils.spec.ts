import { AttachmentModel, AttachmentTreeModel } from '../../../core/models/attachments';
import { WorkItemKind } from '../../../core/models/work-items';
import { buildProjectNodes, buildTaskNodes, countFiles, nodeKeys } from './attachment-tree.utils';

function attachment(
  id: string,
  task: [string, string],
  parent: [string, string] | null = null,
): AttachmentModel {
  return {
    id,
    fileName: `${id}.pdf`,
    contentType: 'application/pdf',
    size: 1,
    createdAt: '2026-09-22T10:00:00Z',
    createdBy: { id: 'u', name: 'Rustam', surname: 'Aliyev' },
    workTask: { id: task[0], code: task[1], name: `Task ${task[1]}` },
    parentWorkTask: parent ? { id: parent[0], code: parent[1], name: `Task ${parent[1]}` } : null,
  };
}

describe('attachment tree utils', () => {
  it('puts subtask files under their subtask inside the parent task, tasks by code', () => {
    const nodes = buildTaskNodes(
      [
        attachment('a', ['t35', '35']),
        attachment('b', ['s70', '70'], ['t34', '34']),
        attachment('c', ['t34', '34']),
        attachment('d', ['s70', '70'], ['t34', '34']),
        attachment('e', ['s71', '71'], ['t34', '34']),
      ],
      'p',
      'k',
    );

    expect(nodes.map((node) => node.code)).toEqual(['34', '35']);
    const [task34] = nodes;
    expect(task34.itemKind).toBe(WorkItemKind.Task);
    expect(task34.files.map((file) => file.id)).toEqual(['c']);
    expect(task34.children.map((child) => [child.code, child.files.length])).toEqual([
      ['70', 2],
      ['71', 1],
    ]);
    expect(task34.children[0].itemKind).toBe(WorkItemKind.Subtask);
    expect(task34.fileCount).toBe(4);
    expect(task34.link).toEqual(['/projects', 'p', 'tickets', 'k', 'tasks', 't34']);
    expect(countFiles(nodes)).toBe(5);
  });

  it('shows a parent that has no files of its own, so its subtask files have a home', () => {
    const [task] = buildTaskNodes([attachment('a', ['s1', '1'], ['t1', '9'])], 'p', 'k');

    expect(task.files).toEqual([]);
    expect(task.fileCount).toBe(1);
    expect(task.children[0].key).toBe('subtask:s1');
  });

  it('keeps plan counts and reads a ticket only once its files are there', () => {
    const tree: AttachmentTreeModel = {
      fileCount: 3,
      groups: [
        {
          id: 'g',
          title: 'Backend',
          fileCount: 3,
          milestones: [
            {
              id: 'm',
              title: 'Sprint 1',
              fileCount: 3,
              tickets: [
                { workTicket: { id: 'k1', code: '28', name: 'Payments' }, fileCount: 2 },
                { workTicket: { id: 'k2', code: '29', name: 'Reports' }, fileCount: 1 },
              ],
            },
          ],
        },
      ],
    };

    const nodes = buildProjectNodes(
      tree,
      (ticketId) =>
        ticketId === 'k1'
          ? { items: [attachment('a', ['t1', '1']), attachment('b', ['t1', '1'])], loading: false, error: null }
          : undefined,
      'p',
    );

    const [loaded, pending] = nodes[0].children[0].children;
    expect(loaded.lazy).toBe(true);
    expect(loaded.loading).toBe(false);
    expect(loaded.children[0].files.length).toBe(2);
    expect(loaded.link).toEqual(['/projects', 'p', 'tickets', 'k1']);
    expect(pending.loading).toBe(true);
    expect(pending.fileCount).toBe(1);
    expect(nodeKeys(nodes)).toEqual(['group:g', 'milestone:m', 'ticket:k1', 'task:t1', 'ticket:k2']);
  });

  /* The tree said 7 while the task inside it, read later, held 8: the fresher files win. */
  it('counts a read ticket by its files and sums every level above it', () => {
    const tree: AttachmentTreeModel = {
      fileCount: 7,
      groups: [
        {
          id: 'g',
          title: 'G',
          fileCount: 7,
          milestones: [
            {
              id: 'm',
              title: 'M',
              fileCount: 7,
              tickets: [{ workTicket: { id: 'k', code: '29', name: 'T' }, fileCount: 7 }],
            },
          ],
        },
      ],
    };
    const items = Array.from({ length: 8 }, (_, index) => attachment(`f${index}`, ['t', '143']));

    const [group] = buildProjectNodes(tree, () => ({ items, loading: false, error: null }), 'p');

    expect(group.fileCount).toBe(8);
    expect(group.children[0].fileCount).toBe(8);
    expect(group.children[0].children[0].fileCount).toBe(8);
  });

  it('marks a ticket whose files failed to load', () => {
    const tree: AttachmentTreeModel = {
      fileCount: 1,
      groups: [
        {
          id: 'g',
          title: 'G',
          fileCount: 1,
          milestones: [
            {
              id: 'm',
              title: 'M',
              fileCount: 1,
              tickets: [{ workTicket: { id: 'k', code: '1', name: 'T' }, fileCount: 1 }],
            },
          ],
        },
      ],
    };

    const nodes = buildProjectNodes(tree, () => ({ items: [], loading: false, error: 'x' }), 'p');

    expect(nodes[0].children[0].children[0].error).toBe(true);
  });
});
