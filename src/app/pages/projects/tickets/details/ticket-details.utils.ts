import { Confirmation } from 'primeng/api';
import { WorkTicketModel } from '../../../../core/models/work-tickets';
import { confirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

export type TicketTab = 'details' | 'tasks' | 'attachments' | 'history';

export function parseTicketTab(value: string | null): TicketTab {
  return value === 'tasks' || value === 'attachments' || value === 'history' ? value : 'details';
}

export function ticketTabQueryParam(tab: TicketTab): string | null {
  return tab === 'details' ? null : tab;
}

export function ticketHasTasks(ticket: Pick<WorkTicketModel, 'totalTaskCount'>): boolean {
  return (ticket.totalTaskCount ?? 0) > 0;
}

/** A ticket with tasks is not deleted: they would be left without a ticket. Says what to do. */
export function ticketDeleteBlockedConfirmation(ticket: WorkTicketModel): Confirmation {
  const taskCount = ticket.totalTaskCount ?? 0;
  const tasks = taskCount === 1 ? 'task' : 'tasks';
  return {
    key: 'ticketDelete',
    header: "This ticket can't be deleted yet",
    message: `#${ticket.code} ${ticket.title}
It still has ${taskCount} ${tasks}. Delete them first, then delete the ticket.`,
    acceptLabel: 'Got it',
    rejectVisible: false,
    acceptButtonProps: confirmTone('warning'),
  };
}

export function ticketDeleteConfirmation(
  ticket: WorkTicketModel,
  accept: () => void,
): Confirmation {
  return {
    key: 'ticketDelete',
    header: 'Delete ticket?',
    message: `#${ticket.code} ${ticket.title}
The ticket will be deleted. This action cannot be undone.`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptButtonProps: confirmTone('danger'),
    accept,
  };
}
