import { effect, inject, Injectable, untracked } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslocoService } from '@jsverse/transloco';
import { catchError, exhaustMap, filter, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { currentLanguage } from '../../core/i18n/active-language';
import { BoardColumnService } from '../../core/services/board-column.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import * as ActionsStore from './board-columns.actions';
import { getLoaded } from './board-columns.selectors';

// the columns are fixed, read once; names come in the user's language, so a language switch reads them again
@Injectable()
export class BoardColumnsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly columns = inject(BoardColumnService);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);
  private readonly loaded = this.store.selectSignal(getLoaded);

  constructor() {
    effect(() => {
      currentLanguage();
      if (!untracked(() => this.loaded())) return;
      untracked(() => this.store.dispatch(ActionsStore.reload()));
    });
  }

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.load),
      withLatestFrom(this.store.select(getLoaded)),
      filter(([, loaded]) => !loaded),
      exhaustMap(() => this.read()),
    ),
  );

  reload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.reload),
      switchMap(() => this.read()),
    ),
  );

  failed$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ActionsStore.loadFailure),
        tap(({ error }) => this.snackBar.error(error)),
      ),
    { dispatch: false },
  );

  private read() {
    return this.columns.getAll().pipe(
      map((items) => ActionsStore.loadSuccess({ items })),
      catchError(() =>
        of(ActionsStore.loadFailure({ error: this.transloco.translate('boardColumns.loadFailed') })),
      ),
    );
  }
}
