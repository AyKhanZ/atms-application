import { CreateWorkTicketCommand } from './create-work-ticket.command';

export interface UpdateWorkTicketCommand extends CreateWorkTicketCommand {
  workTicketStatusId: number;
}
