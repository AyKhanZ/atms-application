import { CreateWorkTicketCommand } from './create-work-ticket.command';

export interface UpdateWorkTicketCommand extends CreateWorkTicketCommand {
  workTicketStatusId: number;
  /** Saving as Closed: close the ticket's open tasks and subtasks too ("Mark all as done"). */
  completeTasks?: boolean;
}
