import { TranslocoService } from '@jsverse/transloco';
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

// tasks would be left without a ticket
export function ticketDeleteBlockedConfirmation(
  ticket: WorkTicketModel,
  transloco: TranslocoService,
): Confirmation {
  return {
    key: 'ticketDelete',
    header: transloco.translate('tickets.deleteBlockedTitle'),
    message: `#${ticket.code} ${ticket.title}
${transloco.translate('tickets.deleteBlocked', { count: ticket.totalTaskCount ?? 0 })}`,
    acceptLabel: transloco.translate('common.gotIt'),
    rejectVisible: false,
    acceptButtonProps: confirmTone('warning'),
  };
}

export function ticketDeleteConfirmation(
  ticket: WorkTicketModel,
  transloco: TranslocoService,
  accept: () => void,
): Confirmation {
  return {
    key: 'ticketDelete',
    header: transloco.translate('tickets.deleteTitle'),
    message: `#${ticket.code} ${ticket.title}
${transloco.translate('tickets.deleteMessage')}`,
    acceptLabel: transloco.translate('common.delete'),
    rejectLabel: transloco.translate('common.cancel'),
    acceptButtonProps: confirmTone('danger'),
    accept,
  };
}
