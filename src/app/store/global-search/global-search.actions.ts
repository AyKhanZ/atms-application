import { createAction, props } from '@ngrx/store';
import { GlobalSearchModel, GlobalSearchPageModel } from '../../core/models/global-search';
import { WorkItemKind } from '../../core/models/work-items';

const key = '[global search]';

export const searchPopup = createAction(`${key} Search Popup`, props<{ query: string }>());
export const searchPopupStarted = createAction(
  `${key} Search Popup Started`,
  props<{ query: string }>(),
);
export const searchPopupSuccess = createAction(
  `${key} Search Popup Success`,
  props<{ query: string; result: GlobalSearchModel }>(),
);
export const searchPopupFailure = createAction(
  `${key} Search Popup Failure`,
  props<{ query: string; error: string }>(),
);
export const resetPopup = createAction(`${key} Reset Popup`);

export const loadPage = createAction(
  `${key} Load Page`,
  props<{
    query: string;
    itemType: WorkItemKind;
    cursor: string | null;
  }>(),
);
export const loadPageSuccess = createAction(
  `${key} Load Page Success`,
  props<{
    query: string;
    itemType: WorkItemKind;
    cursor: string | null;
    page: GlobalSearchPageModel;
  }>(),
);
export const loadPageFailure = createAction(
  `${key} Load Page Failure`,
  props<{ query: string; itemType: WorkItemKind; error: string }>(),
);
export const resetPage = createAction(`${key} Reset Page`);
