import { HistoryAction } from '../enums/history-action.enum';
import { HistoryEntityType } from '../enums/history-entity-type.enum';
import { HistoryField } from '../enums/history-field.enum';
import { HistoryChangeModel, HistoryEntryModel } from '../models/history';
import {
  groupHistory,
  historyFieldList,
  historyKey,
  historyMarker,
  historyShortTime,
  historySummary,
} from './history.utils';

const entry = (overrides: Partial<HistoryEntryModel> = {}): HistoryEntryModel => ({
  id: 'e1',
  entityType: HistoryEntityType.WorkTask,
  action: HistoryAction.Updated,
  createdAt: '2026-09-24T10:00:00',
  changes: [],
  ...overrides,
});

const change = (overrides: Partial<HistoryChangeModel>): HistoryChangeModel => ({
  field: HistoryField.Title,
  ...overrides,
});

describe('historyKey', () => {
  it.each([
    [{ kind: 'project' } as const, 'project:p'],
    [{ kind: 'ticket', workTicketId: 't' } as const, 'ticket:t'],
    [{ kind: 'task', workTaskId: 'k' } as const, 'task:k'],
  ])('keys %j as %s', (scope, expected) => {
    expect(historyKey('p', scope)).toBe(expected);
  });
});

describe('groupHistory', () => {
  const now = new Date(2026, 8, 24, 15, 0);

  it('groups by the viewer calendar day and leaves out empty groups', () => {
    const groups = groupHistory(
      [
        entry({ id: 'today', createdAt: new Date(2026, 8, 24, 0, 5).toISOString() }),
        entry({ id: 'yesterday', createdAt: new Date(2026, 8, 23, 23, 55).toISOString() }),
        entry({ id: 'week', createdAt: new Date(2026, 8, 17, 12).toISOString() }),
        entry({ id: 'month', createdAt: new Date(2026, 7, 25, 12).toISOString() }),
        entry({ id: 'older', createdAt: new Date(2026, 5, 1, 12).toISOString() }),
      ],
      now,
    );

    expect(groups.map((group) => [group.label, group.entries.map((item) => item.id)])).toEqual([
      ['Today', ['today']],
      ['Yesterday', ['yesterday']],
      ['Last 7 days', ['week']],
      ['Last 30 days', ['month']],
      ['Older', ['older']],
    ]);
  });

  it('has no groups for no entries', () => {
    expect(groupHistory([], now)).toEqual([]);
  });
});

describe('historyShortTime', () => {
  // 24 Sep 2026, 15:00 local.
  const now = new Date(2026, 8, 24, 15, 0);

  it.each([
    [new Date(2026, 8, 24, 14, 59, 30), 'just now'],
    [new Date(2026, 8, 24, 14, 55), '5 min ago'],
    [new Date(2026, 8, 24, 14, 0), '1 hour ago'],
    [new Date(2026, 8, 24, 5, 10), '9 hours ago'],
    [new Date(2026, 8, 23, 15, 30), '23 hours ago'],
    [new Date(2026, 8, 23, 9, 30), '23 Sep'],
    [new Date(2026, 8, 9, 9), '9 Sep'],
    [new Date(2025, 7, 12, 9), '12 Aug 2025'],
  ])('writes %s as %s', (date, expected) => {
    expect(historyShortTime(date.toISOString(), now)).toBe(expected);
  });
});

describe('historySummary', () => {
  it.each<[string, HistoryEntryModel, string]>([
    ['creation', entry({ action: HistoryAction.Created }), 'created the task'],
    [
      'one field',
      entry({
        changes: [
          change({ field: HistoryField.Status, newValue: { id: '3', code: '', name: 'Done' } }),
        ],
      }),
      'changed Status to Done',
    ],
    [
      'a cleared field',
      entry({
        changes: [
          change({
            field: HistoryField.Deadline,
            oldValue: { id: '2026-09-22', code: '', name: '' },
          }),
        ],
      }),
      'cleared Deadline',
    ],
    [
      'an assignee',
      entry({
        changes: [
          change({
            field: HistoryField.Assignee,
            newValue: {
              id: 'p',
              code: '',
              name: 'Dilara Zeynalova',
              person: { id: 'p', name: 'Dilara', surname: 'Zeynalova' },
            },
          }),
        ],
      }),
      'assigned Dilara Zeynalova',
    ],
    [
      'a file',
      entry({
        changes: [
          change({
            field: HistoryField.Attachment,
            newValue: { id: 'TZ.pdf', code: '', name: 'TZ.pdf' },
          }),
        ],
      }),
      'added TZ.pdf',
    ],
    [
      'a new stakeholder',
      entry({
        entityType: HistoryEntityType.Project,
        changes: [
          change({
            field: HistoryField.Stakeholder,
            person: { id: 'u', name: 'Alice', surname: 'Smith' },
            newValue: { id: 'r', code: '', name: 'Developer' },
          }),
        ],
      }),
      'added Alice Smith as Developer',
    ],
    [
      'several fields led by the status',
      entry({
        changes: [
          change({ field: HistoryField.Status, newValue: { id: '3', code: '', name: 'Done' } }),
          change({ field: HistoryField.Priority }),
          change({ field: HistoryField.Title }),
        ],
      }),
      'changed Status to Done and made 2 more changes',
    ],
    [
      'several plain fields',
      entry({
        changes: [
          change({ field: HistoryField.Title }),
          change({ field: HistoryField.Description }),
        ],
      }),
      'made 2 changes',
    ],
    [
      'a deleted milestone',
      entry({
        entityType: HistoryEntityType.Milestone,
        action: HistoryAction.Deleted,
        subject: { id: 'm', code: '', name: 'Sprint 1' },
      }),
      'deleted milestone Sprint 1',
    ],
    [
      'a renamed group',
      entry({
        entityType: HistoryEntityType.WorkGroup,
        subject: { id: 'g', code: '', name: 'Core' },
        changes: [
          change({
            field: HistoryField.Title,
            oldValue: { id: 'Backend', code: '', name: 'Backend' },
            newValue: { id: 'Core', code: '', name: 'Core' },
          }),
        ],
      }),
      'renamed group Backend to Core',
    ],
  ])('describes %s', (_, item, expected) => {
    expect(historySummary(item, 'task')).toBe(expected);
  });

  it('names the subtask when the history is a subtask', () => {
    expect(historySummary(entry({ action: HistoryAction.Created }), 'subtask')).toBe(
      'created the subtask',
    );
  });
});

describe('historyFieldList', () => {
  it('lists every touched field once', () => {
    const item = entry({
      changes: [
        change({ field: HistoryField.Status }),
        change({ field: HistoryField.Attachment }),
        change({ field: HistoryField.Attachment }),
      ],
    });

    expect(historyFieldList(item)).toBe('Status · Files');
  });
});

describe('historyMarker', () => {
  it('shows the colour of the status an entry set', () => {
    const done = { id: '3', code: 'Done', name: 'Done' };
    const marker = historyMarker(
      entry({ changes: [change({ field: HistoryField.Status, newValue: done }), change({})] }),
    );

    expect(marker).toEqual({ kind: 'status', status: done, tooltip: 'Status set to Done' });
  });

  it('says a creation set the first status', () => {
    const marker = historyMarker(
      entry({
        action: HistoryAction.Created,
        changes: [
          change({ field: HistoryField.Status, newValue: { id: '1', code: '', name: 'New' } }),
        ],
      }),
    );

    expect(marker?.tooltip).toBe('Created as New');
  });

  it.each<[string, HistoryChangeModel[], string, string]>([
    ['an assignee', [change({ field: HistoryField.Assignee })], 'pi-user', 'Assignee changed'],
    [
      'a new file',
      [
        change({
          field: HistoryField.Attachment,
          newValue: { id: 'a.pdf', code: '', name: 'a.pdf' },
        }),
      ],
      'pi-paperclip',
      'File added',
    ],
    [
      'a removed file',
      [
        change({
          field: HistoryField.Attachment,
          oldValue: { id: 'a.pdf', code: '', name: 'a.pdf' },
        }),
      ],
      'pi-paperclip',
      'File removed',
    ],
    [
      'a stakeholder',
      [change({ field: HistoryField.Stakeholder })],
      'pi-users',
      'Stakeholders changed',
    ],
  ])('marks %s with an icon', (_, changes, icon, tooltip) => {
    expect(historyMarker(entry({ changes }))).toEqual({ kind: 'icon', icon, tooltip });
  });

  it('leaves a plain edit unmarked', () => {
    expect(historyMarker(entry({ changes: [change({ field: HistoryField.Title })] }))).toBeNull();
  });

  it('marks a deletion', () => {
    expect(historyMarker(entry({ action: HistoryAction.Deleted }))?.kind).toBe('icon');
  });
});
