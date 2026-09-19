import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concat, EMPTY, map, of, switchMap, takeUntil, timer } from 'rxjs';
import { GlobalSearchService } from '../../core/services/global-search.service';
import { isSearchable } from '../../shared/components/global-search/work-item-route';
import * as ActionsStore from './global-search.actions';

@Injectable()
export class GlobalSearchEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(GlobalSearchService);

  searchPopup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.searchPopup),
      switchMap(({ query }) => {
        const trimmed = query.trim();
        if (trimmed && !isSearchable(query)) return EMPTY;

        return timer(trimmed ? 300 : 0).pipe(
          switchMap(() => {
            const request = isSearchable(query)
              ? this.service.search(query)
              : this.service.recent();

            return concat(
              trimmed ? of(ActionsStore.searchPopupStarted({ query })) : EMPTY,
              request.pipe(
                map((result) => ActionsStore.searchPopupSuccess({ query, result })),
                catchError(() =>
                  of(
                    ActionsStore.searchPopupFailure({
                      query,
                      error: 'Search is unavailable. Please try again in a moment.',
                    }),
                  ),
                ),
              ),
            );
          }),
          takeUntil(this.actions$.pipe(ofType(ActionsStore.resetPopup))),
        );
      }),
    ),
  );

  loadPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadPage),
      switchMap(({ query, itemType, cursor }) => {
        const trimmed = query.trim();
        if (!trimmed) return EMPTY;

        return this.service.page(itemType, trimmed, cursor).pipe(
          map((page) => ActionsStore.loadPageSuccess({ query: trimmed, itemType, cursor, page })),
          catchError(() =>
            of(
              ActionsStore.loadPageFailure({
                query: trimmed,
                itemType,
                error: 'Results could not be loaded.',
              }),
            ),
          ),
          takeUntil(this.actions$.pipe(ofType(ActionsStore.resetPage))),
        );
      }),
    ),
  );
}
