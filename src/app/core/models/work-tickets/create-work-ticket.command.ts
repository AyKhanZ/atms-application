export interface CreateWorkTicketCommand {
  title: string;
  description: string | null;
  milestoneId: string;
  workTicketTypeId: number;
  priorityId: number;
  deadline: string | null;
  assigneeId: string | null;
}
