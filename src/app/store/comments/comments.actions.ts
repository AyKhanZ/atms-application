import { createAction, props } from '@ngrx/store';
import { CommentModel, CommentPageModel } from '../../core/models/comments';
import { WorkItemMutationError } from '../../core/models/work-items';

const key = '[comments]';

export const load = createAction(
  `${key} Load`,
  props<{ listKey: string; projectId: string; workTaskId: string }>(),
);
export const loadSuccess = createAction(
  `${key} Load Success`,
  props<{ listKey: string; page: CommentPageModel }>(),
);
export const loadFailure = createAction(
  `${key} Load Failure`,
  props<{ listKey: string; error: string }>(),
);

export const loadMore = createAction(
  `${key} Load More`,
  props<{ listKey: string; projectId: string; workTaskId: string; cursor: string }>(),
);
export const loadMoreSuccess = createAction(
  `${key} Load More Success`,
  props<{ listKey: string; page: CommentPageModel }>(),
);
export const loadMoreFailure = createAction(
  `${key} Load More Failure`,
  props<{ listKey: string; error: string }>(),
);

/** `requestId` tells the editor that sent the comment which answer is its own. */
export const create = createAction(
  `${key} Create`,
  props<{
    requestId: string;
    listKey: string;
    projectId: string;
    workTaskId: string;
    text: string;
  }>(),
);
export const createSuccess = createAction(
  `${key} Create Success`,
  props<{ requestId: string; listKey: string; comment: CommentModel }>(),
);
export const createFailure = createAction(
  `${key} Create Failure`,
  props<{ requestId: string; error: WorkItemMutationError }>(),
);

export const update = createAction(
  `${key} Update`,
  props<{ listKey: string; projectId: string; commentId: string; text: string }>(),
);
export const updateSuccess = createAction(
  `${key} Update Success`,
  props<{ listKey: string; comment: CommentModel }>(),
);
export const updateFailure = createAction(
  `${key} Update Failure`,
  props<{ commentId: string; error: WorkItemMutationError }>(),
);

export const remove = createAction(
  `${key} Remove`,
  props<{ listKey: string; projectId: string; commentId: string }>(),
);
export const removeSuccess = createAction(
  `${key} Remove Success`,
  props<{ listKey: string; commentId: string }>(),
);
export const removeFailure = createAction(
  `${key} Remove Failure`,
  props<{ commentId: string; error: WorkItemMutationError }>(),
);

/**
 * A comment added or changed by anyone, read after its push: put in place when on screen, added on
 * top of the list when not.
 */
export const received = createAction(
  `${key} Received`,
  props<{ listKey: string; comment: CommentModel }>(),
);
/** A comment deleted by anyone, known from its push alone. */
export const removedElsewhere = createAction(
  `${key} Removed Elsewhere`,
  props<{ listKey: string; commentId: string }>(),
);

/** The list is gone from the screen: drop it and cancel a load still on its way. */
export const clear = createAction(`${key} Clear`, props<{ listKey: string }>());

export const reset = createAction(`${key} Reset`);
