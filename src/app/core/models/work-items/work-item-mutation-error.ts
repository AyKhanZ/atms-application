export interface WorkItemMutationError {
  status: number;
  // server validation message for 400
  message: string | null;
}
