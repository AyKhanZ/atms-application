/**
 * The four kinds of work: what the details headers, lists, the switcher and search tell apart by
 * icon and colour. The numbers match the server, which sends the number, not the name — search
 * and the recent list use the same values.
 */
export enum WorkItemKind {
  Project = 1,
  Ticket = 2,
  Task = 3,
  Subtask = 4,
}
