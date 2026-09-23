import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';

export interface TaskParentOption {
  id: string;
  code: string;
  title: string;
  kind: 'ticket' | 'task';
  ticketId: string;
  ticketCode: string;
  ticketTitle: string;
  groupId: string;
  groupTitle: string;
  milestoneId: string;
  milestoneTitle: string;
}

export function ticketParentOption(ticket: WorkTicketModel): TaskParentOption {
  return {
    id: ticket.id,
    code: ticket.code,
    title: ticket.title,
    kind: 'ticket',
    ticketId: ticket.id,
    ticketCode: ticket.code,
    ticketTitle: ticket.title,
    groupId: ticket.groupId,
    groupTitle: ticket.groupTitle,
    milestoneId: ticket.milestoneId,
    milestoneTitle: ticket.milestoneTitle,
  };
}

export function taskParentOption(task: WorkTaskModel): TaskParentOption {
  return {
    id: task.id,
    code: task.code,
    title: task.title,
    kind: 'task',
    ticketId: task.workTicket.id,
    ticketCode: task.workTicket.code,
    ticketTitle: task.workTicket.name,
    groupId: task.groupId,
    groupTitle: task.groupTitle,
    milestoneId: task.milestoneId,
    milestoneTitle: task.milestoneTitle,
  };
}

/**
 * The parent of an item being edited, built from the item itself: a subtask carries its parent's
 * code and title, and a top-level task belongs to its ticket. Saves a second request just to
 * preselect the control.
 */
export function editedTaskParentOption(
  task: WorkTaskModel | null | undefined,
  ticket: WorkTicketModel | null | undefined,
): TaskParentOption | null {
  if (!task) return ticket ? ticketParentOption(ticket) : null;

  if (!task.parentWorkTask?.id) {
    return ticket
      ? ticketParentOption(ticket)
      : {
          id: task.workTicket.id,
          code: task.workTicket.code,
          title: task.workTicket.name,
          kind: 'ticket',
          ticketId: task.workTicket.id,
          ticketCode: task.workTicket.code,
          ticketTitle: task.workTicket.name,
          groupId: task.groupId,
          groupTitle: task.groupTitle,
          milestoneId: task.milestoneId,
          milestoneTitle: task.milestoneTitle,
        };
  }

  return {
    id: task.parentWorkTask?.id,
    code: task.parentWorkTask?.code ?? '',
    title: task.parentWorkTask?.name ?? '',
    kind: 'task',
    ticketId: task.workTicket.id,
    ticketCode: task.workTicket.code,
    ticketTitle: task.workTicket.name,
    groupId: task.groupId,
    groupTitle: task.groupTitle,
    milestoneId: task.milestoneId,
    milestoneTitle: task.milestoneTitle,
  };
}

export interface TaskParentGroup {
  label: string;
  /** Ancestors of the group, outermost first, rendered as indented lines above its items. */
  path: string[];
  items: TaskParentOption[];
}

/**
 * Buckets the options by their place in the plan and keeps the full chain, so the dropdown reads
 * like the Plan tab rather than as one flat list: a ticket sits under Group › Milestone, a task
 * one level deeper under its ticket.
 */
export function groupParentOptions(options: TaskParentOption[]): TaskParentGroup[] {
  const groups = new Map<string, TaskParentGroup>();
  for (const option of options) {
    const key = option.kind === 'ticket' ? option.milestoneId : option.ticketId;
    let group = groups.get(key);
    if (!group) {
      const path =
        option.kind === 'ticket'
          ? [option.groupTitle, option.milestoneTitle]
          : [
              option.groupTitle,
              option.milestoneTitle,
              `#${option.ticketCode} ${option.ticketTitle}`,
            ];
      group = { label: path.join(' › '), path, items: [] };
      groups.set(key, group);
    }
    if (!group.items.some((item) => item.id === option.id)) group.items.push(option);
  }

  return [...groups.values()];
}
