import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, groupBy, map, merge, mergeMap, of, switchMap, takeUntil } from 'rxjs';
import { WorkTicketsService } from '../../core/services/work-tickets.service';
import { toMutationError } from '../../core/utils/http-error.utils';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './work-tickets.actions';

@Injectable()
export class WorkTicketsEffects {
  private readonly actions$ = inject(Actions);
  private readonly tickets = inject(WorkTicketsService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );

  loadTickets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadTickets),
      groupBy(({ requestKey }) => requestKey),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ requestKey, projectId, filter, append }) =>
            this.tickets.getWorkTickets(projectId, filter).pipe(
              map((page) => ActionsStore.loadTicketsSuccess({ requestKey, append, page })),
              catchError(() =>
                of(
                  ActionsStore.loadTicketsFailure({
                    requestKey,
                    error: 'Tickets could not be loaded.',
                  }),
                ),
              ),
              takeUntil(this.stopped(requestKey)),
            ),
          ),
        ),
      ),
    ),
  );

  loadTicket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadTicket),
      switchMap(({ projectId, ticketId }) =>
        this.tickets.getWorkTicket(projectId, ticketId).pipe(
          map((ticket) => ActionsStore.loadTicketSuccess({ ticket })),
          catchError(() =>
            of(ActionsStore.loadTicketFailure({ error: 'Ticket could not be loaded.' })),
          ),
          takeUntil(this.actions$.pipe(ofType(ActionsStore.resetDetail))),
        ),
      ),
    ),
  );

  createTicket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.createTicket),
      switchMap(({ projectId, command }) =>
        this.tickets.createWorkTicket(projectId, command).pipe(
          map((id) => ActionsStore.createTicketSuccess({ projectId, id })),
          catchError((error: unknown) =>
            of(ActionsStore.createTicketFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  updateTicket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.updateTicket),
      switchMap(({ projectId, ticketId, command }) =>
        this.tickets.updateWorkTicket(projectId, ticketId, command).pipe(
          map(() => ActionsStore.updateTicketSuccess({ projectId, ticketId })),
          catchError((error: unknown) =>
            of(ActionsStore.updateTicketFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  deleteTicket$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.deleteTicket),
      switchMap(({ projectId, ticketId }) =>
        this.tickets.deleteWorkTicket(projectId, ticketId).pipe(
          map(() => ActionsStore.deleteTicketSuccess({ projectId, ticketId })),
          catchError((error: unknown) =>
            of(ActionsStore.deleteTicketFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  /**
   * A list load stops when its list is cleared, the store is reset or the session ends: a late
   * answer would otherwise put back a page nobody shows any more.
   */
  private stopped(requestKey: string) {
    return merge(
      this.reset$,
      this.actions$.pipe(
        ofType(ActionsStore.clearPage),
        filter((action) => action.requestKey === requestKey),
      ),
    );
  }
}
