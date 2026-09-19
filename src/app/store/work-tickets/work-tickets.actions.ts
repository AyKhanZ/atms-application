import { createAction, props } from '@ngrx/store';
import {
  CreateWorkTicketCommand,
  UpdateWorkTicketCommand,
  WorkTicketFilter,
  WorkTicketModel,
  WorkTicketPageModel,
} from '../../core/models/work-tickets';
import { WorkItemMutationError } from '../../core/models/work-items';

const key = '[work tickets]';

export const loadTickets = createAction(
  `${key} Load Tickets`,
  props<{ requestKey: string; projectId: string; filter: WorkTicketFilter; append: boolean }>(),
);
export const loadTicketsSuccess = createAction(
  `${key} Load Tickets Success`,
  props<{ requestKey: string; append: boolean; page: WorkTicketPageModel }>(),
);
export const loadTicketsFailure = createAction(
  `${key} Load Tickets Failure`,
  props<{ requestKey: string; error: string }>(),
);

export const loadTicket = createAction(
  `${key} Load Ticket`,
  props<{ projectId: string; ticketId: string }>(),
);
export const loadTicketSuccess = createAction(
  `${key} Load Ticket Success`,
  props<{ ticket: WorkTicketModel }>(),
);
export const loadTicketFailure = createAction(
  `${key} Load Ticket Failure`,
  props<{ error: string }>(),
);

export const createTicket = createAction(
  `${key} Create Ticket`,
  props<{ projectId: string; command: CreateWorkTicketCommand }>(),
);
export const createTicketSuccess = createAction(
  `${key} Create Ticket Success`,
  props<{ projectId: string; id: string }>(),
);
export const createTicketFailure = createAction(
  `${key} Create Ticket Failure`,
  props<{ error: WorkItemMutationError }>(),
);
export const updateTicket = createAction(
  `${key} Update Ticket`,
  props<{ projectId: string; ticketId: string; command: UpdateWorkTicketCommand }>(),
);
export const updateTicketSuccess = createAction(
  `${key} Update Ticket Success`,
  props<{ projectId: string; ticketId: string }>(),
);
export const updateTicketFailure = createAction(
  `${key} Update Ticket Failure`,
  props<{ error: WorkItemMutationError }>(),
);
export const deleteTicket = createAction(
  `${key} Delete Ticket`,
  props<{ projectId: string; ticketId: string }>(),
);
export const deleteTicketSuccess = createAction(
  `${key} Delete Ticket Success`,
  props<{ projectId: string; ticketId: string }>(),
);
export const deleteTicketFailure = createAction(
  `${key} Delete Ticket Failure`,
  props<{ error: WorkItemMutationError }>(),
);

/** The list is gone: drop its page and cancel a load still on its way. */
export const clearPage = createAction(`${key} Clear Page`, props<{ requestKey: string }>());
export const resetDetail = createAction(`${key} Reset Detail`);
export const reset = createAction(`${key} Reset`);
