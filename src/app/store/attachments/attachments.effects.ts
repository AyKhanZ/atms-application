import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, groupBy, map, merge, mergeMap, of, switchMap, takeUntil } from 'rxjs';
import { AttachmentsService } from '../../core/services/attachments.service';
import { toMutationError, validationMessage } from '../../core/utils/http-error.utils';
import { MAX_ATTACHMENT_SIZE_MB } from '../../core/utils/attachment.utils';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './attachments.actions';

/** Files sent at once. The rest wait their turn, so ten files do not split one connection ten ways. */
const PARALLEL_UPLOADS = 3;

@Injectable()
export class AttachmentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly attachments = inject(AttachmentsService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );

  loadList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadList),
      groupBy(({ listKey }) => listKey),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ listKey, projectId, scope }) =>
            this.attachments.getAttachments(projectId, scope).pipe(
              map((list) => ActionsStore.loadListSuccess({ listKey, list })),
              catchError(() =>
                of(
                  ActionsStore.loadListFailure({ listKey, error: 'Files could not be loaded.' }),
                ),
              ),
              takeUntil(
                merge(
                  this.reset$,
                  this.actions$.pipe(
                    ofType(ActionsStore.clearList),
                    filter((action) => action.listKey === listKey),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  loadTree$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadTree),
      groupBy(({ projectId }) => projectId),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ projectId }) =>
            this.attachments.getTree(projectId).pipe(
              map((tree) => ActionsStore.loadTreeSuccess({ projectId, tree })),
              catchError(() =>
                of(
                  ActionsStore.loadTreeFailure({ projectId, error: 'Files could not be loaded.' }),
                ),
              ),
              takeUntil(
                merge(
                  this.reset$,
                  this.actions$.pipe(
                    ofType(ActionsStore.clearTree),
                    filter((action) => action.projectId === projectId),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  upload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.upload),
      mergeMap(
        ({ uploadId, listKey, projectId, workTaskId, file }) =>
          this.attachments.upload(projectId, workTaskId, file).pipe(
            map((event) => {
              if (event.type === HttpEventType.UploadProgress) {
                const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
                return ActionsStore.uploadProgress({ uploadId, progress });
              }
              if (event.type === HttpEventType.Response && event.body) {
                return ActionsStore.uploadSuccess({ uploadId, listKey, attachment: event.body });
              }
              return null;
            }),
            filter((action) => action !== null),
            catchError((error: unknown) =>
              of(
                ActionsStore.uploadFailure({
                  uploadId,
                  error: uploadErrorMessage(error),
                  retryable: isTransient(error),
                }),
              ),
            ),
            takeUntil(
              merge(
                this.reset$,
                this.actions$.pipe(
                  ofType(ActionsStore.dismissUpload),
                  filter((action) => action.uploadId === uploadId),
                ),
              ),
            ),
          ),
        PARALLEL_UPLOADS,
      ),
    ),
  );

  rename$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.rename),
      mergeMap(({ projectId, attachmentId, baseName, fileName }) =>
        this.attachments.rename(projectId, attachmentId, baseName).pipe(
          map(() => ActionsStore.renameSuccess({ attachmentId, fileName })),
          catchError((error: unknown) =>
            of(ActionsStore.renameFailure({ attachmentId, error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  remove$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.remove),
      mergeMap(({ projectId, attachmentId }) =>
        this.attachments.delete(projectId, attachmentId).pipe(
          map(() => ActionsStore.removeSuccess({ attachmentId })),
          catchError((error: unknown) =>
            of(ActionsStore.removeFailure({ attachmentId, error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );
}

function uploadErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'The file could not be uploaded.';
  if (error.status === 413) return `This file is larger than ${MAX_ATTACHMENT_SIZE_MB} MB.`;
  if (error.status === 0) return 'The server could not be reached. Check the connection and retry.';
  if (error.status === 403) return 'You can no longer add files to this task.';
  return validationMessage(error) ?? 'The file could not be uploaded. Try again.';
}

/** No answer or a server fault: the file itself was not judged, so a retry can succeed. */
function isTransient(error: unknown): boolean {
  return !(error instanceof HttpErrorResponse) || error.status === 0 || error.status >= 500;
}
