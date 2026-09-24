/** Ticket statuses. The numbers match the server's `WorkTicketStatusEnum`. */
export enum WorkTicketStatus {
  New = 1,
  InProgress = 2,
  InReview = 3,
  Testing = 4,
  Closed = 5,
  Rejected = 6,
}
