import { type Action, createReducer, on } from '@ngrx/store';
import { AuthStoreActions } from '../auth';
import * as Actions from './work-tickets.actions';
import { initialWorkTicketsState, WorkTicketsState } from './work-tickets.state';

const reducer = createReducer(
  initialWorkTicketsState,
  on(
    Actions.loadTickets,
    (state, { requestKey, append }): WorkTicketsState => ({
      ...state,
      pages: {
        ...state.pages,
        [requestKey]: {
          items: append ? (state.pages[requestKey]?.items ?? []) : [],
          nextCursor: append ? (state.pages[requestKey]?.nextCursor ?? null) : null,
          hasMore: append ? (state.pages[requestKey]?.hasMore ?? false) : false,
          loading: true,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadTicketsSuccess,
    (state, { requestKey, append, page }): WorkTicketsState => ({
      ...state,
      pages: {
        ...state.pages,
        [requestKey]: {
          items: append ? [...(state.pages[requestKey]?.items ?? []), ...page.items] : page.items,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          loading: false,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadTicketsFailure,
    (state, { requestKey, error }): WorkTicketsState => ({
      ...state,
      pages: {
        ...state.pages,
        [requestKey]: {
          ...(state.pages[requestKey] ?? { items: [], nextCursor: null, hasMore: false }),
          loading: false,
          error,
        },
      },
    }),
  ),
  on(
    Actions.loadTicket,
    (state): WorkTicketsState => ({
      ...state,
      item: null,
      detailLoading: true,
      detailError: null,
    }),
  ),
  on(
    Actions.loadTicketSuccess,
    (state, { ticket }): WorkTicketsState => ({ ...state, item: ticket, detailLoading: false }),
  ),
  on(
    Actions.loadTicketFailure,
    (state, { error }): WorkTicketsState => ({
      ...state,
      detailLoading: false,
      detailError: error,
    }),
  ),
  on(
    Actions.createTicket,
    Actions.updateTicket,
    Actions.deleteTicket,
    (state): WorkTicketsState => ({ ...state, saving: true, mutationError: null }),
  ),
  on(
    Actions.createTicketSuccess,
    Actions.updateTicketSuccess,
    Actions.deleteTicketSuccess,
    (state): WorkTicketsState => ({ ...state, saving: false }),
  ),
  on(
    Actions.createTicketFailure,
    Actions.updateTicketFailure,
    Actions.deleteTicketFailure,
    (state, { error }): WorkTicketsState => ({ ...state, saving: false, mutationError: error }),
  ),
  on(Actions.clearPage, (state, { requestKey }): WorkTicketsState => {
    const pages = { ...state.pages };
    delete pages[requestKey];
    return { ...state, pages };
  }),
  on(
    Actions.resetDetail,
    (state): WorkTicketsState => ({
      ...state,
      item: null,
      detailLoading: false,
      detailError: null,
      saving: false,
      mutationError: null,
    }),
  ),
  on(Actions.reset, (): WorkTicketsState => initialWorkTicketsState),
  // Everything here is the signed-in user's; none of it may outlive the session.
  on(AuthStoreActions.logoutCompleted, (): WorkTicketsState => initialWorkTicketsState),
);

export function workTicketsReducer(
  state: WorkTicketsState | undefined,
  action: Action,
): WorkTicketsState {
  return reducer(state, action);
}
