import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DictionaryService } from '../../core/services/dictionary.service';
import { DictionaryStoreActions } from './index';

@Injectable()
export class DictionaryEffects {
  private readonly actions$ = inject(Actions);
  private readonly dictionaryService = inject(DictionaryService);

  // GET /dictionary/genders
  loadGenders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DictionaryStoreActions.loadGenderDictionaries),
      switchMap(() =>
        this.dictionaryService.getGenderDictionaries().pipe(
          map((items) => DictionaryStoreActions.loadGenderDictionariesSuccess({ items })),
          catchError((err) => {
            console.error('[Dictionary] Failed to load gender dictionaries', err);
            return EMPTY;
          }),
        ),
      ),
    ),
  );

  // GET /dictionary/marital-statuses
  loadMaritalStatuses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DictionaryStoreActions.loadMaritalStatusDictionaries),
      switchMap(() =>
        this.dictionaryService.getMaritalStatusDictionaries().pipe(
          map((items) => DictionaryStoreActions.loadMaritalStatusDictionariesSuccess({ items })),
          catchError((err) => {
            console.error('[Dictionary] Failed to load marital-status dictionaries', err);
            return EMPTY;
          }),
        ),
      ),
    ),
  );

  // GET /dictionary/user-statuses
  loadUserStatuses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DictionaryStoreActions.loadUserStatusDictionaries),
      switchMap(() =>
        this.dictionaryService.getUserStatusDictionaries().pipe(
          map((items) => DictionaryStoreActions.loadUserStatusDictionariesSuccess({ items })),
          catchError((err) => {
            console.error('[Dictionary] Failed to load user-status dictionaries', err);
            return EMPTY;
          }),
        ),
      ),
    ),
  );

  // GET /dictionary/roles
  loadRoles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DictionaryStoreActions.loadRoleDictionaries),
      switchMap(() =>
        this.dictionaryService.getRoleDictionaries().pipe(
          map((items) => DictionaryStoreActions.loadRoleDictionariesSuccess({ items })),
          catchError((err) => {
            console.error('[Dictionary] Failed to load role dictionaries', err);
            return EMPTY;
          }),
        ),
      ),
    ),
  );
  // GET /dictionary/permissions
  loadPermissions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DictionaryStoreActions.loadPermissionDictionaries),
      switchMap(() =>
        this.dictionaryService.getPermissionDictionaries().pipe(
          map((items) => DictionaryStoreActions.loadPermissionDictionariesSuccess({ items })),
          catchError((err) => {
            console.error('[Dictionary] Failed to load permission dictionaries', err);
            return EMPTY;
          }),
        ),
      ),
    ),
  );
}
