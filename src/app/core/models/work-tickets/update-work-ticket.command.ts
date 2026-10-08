import { CreateWorkTicketCommand } from './create-work-ticket.command';

export interface UpdateWorkTicketCommand extends CreateWorkTicketCommand {
  workTicketStatusId: number;
  // Closed also closes open tasks and subtasks ("Mark all as done")
  completeTasks?: boolean;
}
