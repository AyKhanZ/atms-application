/** Where a project, ticket or task opens: the ids its page address is built from. */
export interface WorkItemRefModel {
  projectId: string;
  workTicketId: string | null;
  workTaskId: string | null;
}
