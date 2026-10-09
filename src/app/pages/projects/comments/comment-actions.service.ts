import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { CommentModel } from '../../../core/models/comments';
import { WorkItemMutationError } from '../../../core/models/work-items';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { commentAnchor } from '../../../core/utils/comment-anchor.utils';
import { confirmTone } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CommentsStoreActions } from '../../../store/comments';

interface CommentsScope {
  listKey: string;
  projectId: string;
  workTaskId: string;
}

let nextRequestId = 0;

// one per discussion so cards dont pass it through inputs, changes go to the store as actions
@Injectable()
export class CommentActionsService {
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);
  private readonly snackBar = inject(SnackBarService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  private scope: CommentsScope | null = null;
  private request: string | null = null;
  private onSent: (() => void) | null = null;

  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);
  readonly sending = signal(false);
  readonly sendError = signal<string | null>(null);

  constructor() {
    const actions = inject(Actions);
    const destroyRef = inject(DestroyRef);

    actions
      .pipe(ofType(CommentsStoreActions.createSuccess), takeUntilDestroyed(destroyRef))
      .subscribe(({ requestId }) => {
        if (requestId !== this.request) return;
        this.request = null;
        this.sending.set(false);
        this.onSent?.();
      });
    actions
      .pipe(ofType(CommentsStoreActions.createFailure), takeUntilDestroyed(destroyRef))
      .subscribe(({ requestId, error }) => {
        if (requestId !== this.request) return;
        this.request = null;
        this.sending.set(false);
        this.sendError.set(this.mutationMessage(error, 'comments.saveFailed'));
      });
    actions
      .pipe(ofType(CommentsStoreActions.updateSuccess), takeUntilDestroyed(destroyRef))
      .subscribe(({ comment }) => {
        if (comment.id !== this.editingId()) return;
        this.saving.set(false);
        this.editingId.set(null);
      });
    actions
      .pipe(ofType(CommentsStoreActions.updateFailure), takeUntilDestroyed(destroyRef))
      .subscribe(({ commentId, error }) => {
        if (commentId !== this.editingId()) return;
        this.saving.set(false);
        this.editError.set(this.mutationMessage(error, 'comments.editFailed'));
      });
    actions
      .pipe(ofType(CommentsStoreActions.removeFailure), takeUntilDestroyed(destroyRef))
      .subscribe(({ error }) =>
        this.snackBar.error(
          error.status === 403
            ? this.text('comments.deleteDenied')
            : this.mutationMessage(error, 'comments.deleteFailed'),
        ),
      );
  }

  // task changed, whatever was open belonged to the previous one
  setScope(scope: CommentsScope): void {
    this.scope = scope;
    this.request = null;
    this.editingId.set(null);
    this.sending.set(false);
    this.saving.set(false);
    this.sendError.set(null);
  }

  send(text: string, done: () => void): void {
    const scope = this.scope;
    if (!scope || this.sending()) return;

    this.request = `comment-${nextRequestId++}`;
    this.onSent = done;
    this.sending.set(true);
    this.sendError.set(null);
    this.store.dispatch(
      CommentsStoreActions.create({
        requestId: this.request,
        listKey: scope.listKey,
        projectId: scope.projectId,
        workTaskId: scope.workTaskId,
        text,
      }),
    );
  }

  clearSendError(): void {
    this.sendError.set(null);
  }

  startEdit(comment: CommentModel): void {
    this.editError.set(null);
    this.saving.set(false);
    this.editingId.set(comment.id);
  }

  cancelEdit(): void {
    if (this.saving()) return;
    this.editingId.set(null);
  }

  save(commentId: string, text: string): void {
    const scope = this.scope;
    if (!scope || this.saving()) return;

    this.saving.set(true);
    this.editError.set(null);
    this.store.dispatch(
      CommentsStoreActions.update({
        listKey: scope.listKey,
        projectId: scope.projectId,
        commentId,
        text,
      }),
    );
  }

  confirmDelete(comment: CommentModel): void {
    const scope = this.scope;
    if (!scope) return;

    this.confirmation.confirm({
      key: 'commentDelete',
      header: this.text('comments.deleteTitle'),
      message: this.text('comments.deleteMessage'),
      acceptLabel: this.text('common.delete'),
      rejectLabel: this.text('common.cancel'),
      acceptButtonProps: confirmTone('danger'),
      accept: () =>
        this.store.dispatch(
          CommentsStoreActions.remove({
            listKey: scope.listKey,
            projectId: scope.projectId,
            commentId: comment.id,
          }),
        ),
    });
  }

  linkTo(commentId: string): string {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { tab: null },
      queryParamsHandling: 'merge',
      fragment: commentAnchor(commentId),
    });
    return `${window.location.origin}${this.router.serializeUrl(tree)}`;
  }

  copyLink(commentId: string): void {
    navigator.clipboard.writeText(this.linkTo(commentId)).then(
      () => this.snackBar.success(this.text('comments.linkCopied')),
      () => this.snackBar.error(this.text('comments.linkCopyFailed')),
    );
  }

  // server reason for 400, otherwise by status. fallback is a translation key
  private mutationMessage(error: WorkItemMutationError, fallback: string): string {
    if (error.message) return error.message;
    if (error.status === 403) return this.text('comments.cannotComment');
    if (error.status === 404) return this.text('comments.gone');
    if (error.status === 0) return this.text('comments.offline');
    return this.text(fallback);
  }

  private text(key: string): string {
    return this.transloco.translate(key);
  }
}
