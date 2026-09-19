/**
 * Why the server refused a change to a ticket or a task. The page words it: the status picks the
 * sentence (no permission, gone, try again) and a validation message from the server wins over all.
 */
export interface WorkItemMutationError {
  status: number;
  /** The server's own validation message for a 400, if it sent one. */
  message: string | null;
}
