import { createAction, props } from '@ngrx/store';
import { HistoryPageModel, HistoryScope, HistoryStateModel } from '../../core/models/history';

const key = '[history]';

/** The first page and the statuses, read again every time the tab opens. */
export const load = createAction(
  `${key} Load`,
  props<{ historyKey: string; projectId: string; scope: HistoryScope }>(),
);
export const loadSuccess = createAction(
  `${key} Load Success`,
  props<{ historyKey: string; page: HistoryPageModel; states: HistoryStateModel[] | null }>(),
);
export const loadFailure = createAction(
  `${key} Load Failure`,
  props<{ historyKey: string; error: string }>(),
);

export const loadMore = createAction(
  `${key} Load More`,
  props<{ historyKey: string; projectId: string; scope: HistoryScope; cursor: string }>(),
);
export const loadMoreSuccess = createAction(
  `${key} Load More Success`,
  props<{ historyKey: string; page: HistoryPageModel }>(),
);
export const loadMoreFailure = createAction(
  `${key} Load More Failure`,
  props<{ historyKey: string; error: string }>(),
);

/** The history is gone from the screen: drop it and cancel a load still on its way. */
export const clear = createAction(`${key} Clear`, props<{ historyKey: string }>());

export const reset = createAction(`${key} Reset`);
