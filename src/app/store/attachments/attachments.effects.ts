import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  EMPTY,
  Observable,
  catchError,
  filter,
  groupBy,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { AttachmentUploadFilesService } from '../../core/services/attachment-upload-files.service';
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
  private readonly uploadFiles = inject(AttachmentUploadFilesService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );

  loadList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadList),
      // One stream per list on screen, closed when it leaves, not kept for every list ever opened.
      groupBy(({ listKey }) => listKey, { duration: (group) => this.listGone(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ listKey, projectId, scope }) =>
            this.attachments.getAttachments(projectId, scope).pipe(
              map((list) => ActionsStore.loadListSuccess({ listKey, list })),
              catchError(() =>
                of(ActionsStore.loadListFailure({ listKey, error: 'Files could not be loaded.' })),
              ),
              takeUntil(this.listGone(listKey)),
            ),
          ),
        ),
      ),
    ),
  );

  loadTree$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadTree),
      groupBy(({ projectId }) => projectId, { duration: (group) => this.treeGone(group.key) }),
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
              takeUntil(this.treeGone(projectId)),
            ),
          ),
        ),
      ),
    ),
  );

  upload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.upload),
      mergeMap(({ uploadId, listKey, projectId, workTaskId }) => {
        // Only three files go at once; the rest wait here, where the cancel below cannot hear
        // them yet. A file cancelled while waiting is already gone from the registry, so its
        // turn comes and nothing is sent.
        const file = this.uploadFiles.get(uploadId);
        if (!file) return EMPTY;

        return this.attachments.upload(projectId, workTaskId, file).pipe(
          map((event) => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
              return ActionsStore.uploadProgress({ uploadId, progress });
            }
            if (event.type === HttpEventType.Response && event.body) {
              this.uploadFiles.delete(uploadId);
              return ActionsStore.uploadSuccess({ uploadId, listKey, attachment: event.body });
            }
            return null;
          }),
          filter((action) => action !== null),
          catchError((error: unknown) => {
            const retryable = isTransient(error);
            // Kept only while Retry can use it; a refused file will not be sent again.
            if (!retryable) this.uploadFiles.delete(uploadId);
            return of(
              ActionsStore.uploadFailure({ uploadId, error: uploadErrorMessage(error), retryable }),
            );
          }),
          takeUntil(
            merge(
              this.reset$,
              this.actions$.pipe(
                ofType(ActionsStore.dismissUpload),
                filter((action) => action.uploadId === uploadId),
              ),
            ),
          ),
        );
      }, PARALLEL_UPLOADS),
    ),
  );

  /** A dismissed or cancelled upload, or the end of the session, lets go of the files it held. */
  releaseFiles$ = createEffect(
    () =>
      merge(
        this.actions$.pipe(
          ofType(ActionsStore.dismissUpload),
          tap(({ uploadId }) => this.uploadFiles.delete(uploadId)),
        ),
        this.reset$.pipe(tap(() => this.uploadFiles.clear())),
      ),
    { dispatch: false },
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

  /** The list left the screen: its load is cancelled and its stream closed. */
  private listGone(listKey: string): Observable<unknown> {
    return merge(
      this.reset$,
      this.actions$.pipe(
        ofType(ActionsStore.clearList),
        filter((action) => action.listKey === listKey),
      ),
    );
  }

  private treeGone(projectId: string): Observable<unknown> {
    return merge(
      this.reset$,
      this.actions$.pipe(
        ofType(ActionsStore.clearTree),
        filter((action) => action.projectId === projectId),
      ),
    );
  }
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
