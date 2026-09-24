import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { AttachmentModel, AttachmentScope } from '../../../../core/models/attachments';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { SnackBarService } from '../../../../core/services/snack-bar.service';
import { attachmentListKey } from '../../../../core/utils/attachment.utils';
import {
  ConfirmDialogComponent,
  confirmTone,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AttachmentsStoreActions, AttachmentsStoreSelectors } from '../../../../store/attachments';
import { AttachmentFilesService } from '../attachment-files.service';
import { AttachmentUploadQueueService } from '../attachment-upload-queue.service';
import { AttachmentTreeNode } from '../attachment-tree-node';
import { buildTaskNodes, countFiles } from '../attachment-tree.utils';
import { AttachmentListSkeletonComponent } from '../components/attachment-list-skeleton/attachment-list-skeleton.component';
import { AttachmentPreviewDialogComponent } from '../components/attachment-preview-dialog/attachment-preview-dialog.component';
import {
  AttachmentRenameDialogComponent,
  AttachmentRenameEvent,
} from '../components/attachment-rename-dialog/attachment-rename-dialog.component';
import { AttachmentRowComponent } from '../components/attachment-row/attachment-row.component';
import { AttachmentTreeComponent } from '../components/attachment-tree/attachment-tree.component';
import { AttachmentUploadListComponent } from '../components/attachment-upload-list/attachment-upload-list.component';
import { AttachmentUploadZoneComponent } from '../components/attachment-upload-zone/attachment-upload-zone.component';
import { AttachmentRefusedComponent } from '../components/attachment-refused/attachment-refused.component';

/** Past this many files a tree opens only its first branch; below it everything is open. */
const OPEN_ALL_UP_TO = 20;

/**
 * A task's or subtask's own files, the only place they are added, renamed and deleted. A task
 * also shows what its subtasks hold, read-only, since it is their parent.
 */
@Component({
  selector: 'app-task-attachments-tab',
  imports: [
    ButtonModule,
    ConfirmDialogComponent,
    EmptyStateComponent,
    AttachmentListSkeletonComponent,
    AttachmentPreviewDialogComponent,
    AttachmentRenameDialogComponent,
    AttachmentRowComponent,
    AttachmentTreeComponent,
    AttachmentUploadListComponent,
    AttachmentUploadZoneComponent,
    AttachmentRefusedComponent,
  ],
  providers: [AttachmentUploadQueueService],
  templateUrl: './task-attachments-tab.component.html',
  styleUrl: './task-attachments-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAttachmentsTabComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly actions = inject(Actions);
  private readonly confirmation = inject(ConfirmationService);
  private readonly snackBar = inject(SnackBarService);
  private readonly files = inject(AttachmentFilesService);

  readonly task = input.required<WorkTaskModel>();
  readonly canEdit = input(false);

  private readonly lists = this.store.selectSignal(AttachmentsStoreSelectors.getLists);
  readonly uploads = inject(AttachmentUploadQueueService);
  private readonly pendingIds = this.store.selectSignal(AttachmentsStoreSelectors.getPendingIds);

  readonly projectId = computed(() => this.task().workProjectId);
  private readonly ownScope = computed<AttachmentScope>(() => ({
    kind: 'task',
    workTaskId: this.task().id,
  }));
  private readonly subtasksScope = computed<AttachmentScope | null>(() =>
    this.task().isSubtask ? null : { kind: 'subtasks', parentWorkTaskId: this.task().id },
  );
  readonly ownKey = computed(() => attachmentListKey(this.ownScope()));
  private readonly subtasksKey = computed(() => {
    const scope = this.subtasksScope();
    return scope ? attachmentListKey(scope) : null;
  });

  private readonly own = computed(() => this.lists()[this.ownKey()]);
  readonly ownItems = computed(() => this.own()?.items ?? []);
  readonly ownLoading = computed(
    () => !this.own() || (this.own()!.loading && !this.ownItems().length),
  );
  readonly ownError = computed(() => !!this.own()?.error && !this.ownItems().length);
  readonly pending = computed(() => new Set(this.pendingIds()));

  private readonly subtasks = computed(() => {
    const key = this.subtasksKey();
    return key ? this.lists()[key] : undefined;
  });
  readonly subtaskNodes = computed<AttachmentTreeNode[]>(() => {
    const task = this.task();
    return buildTaskNodes(
      this.subtasks()?.items ?? [],
      task.workProjectId,
      task.workTicket.id,
    ).flatMap((node) => node.children);
  });
  private readonly firstSubtaskKey = computed(() => this.subtaskNodes()[0]?.key ?? null);
  readonly subtasksOpenByDefault = (node: AttachmentTreeNode) =>
    countFiles(this.subtaskNodes()) <= OPEN_ALL_UP_TO || node.key === this.firstSubtaskKey();

  /** Lists this tab asked for, cleared when it goes or moves to another task. */
  private loadedKeys = new Set<string>();
  readonly previewing = signal<AttachmentModel | null>(null);
  readonly renaming = signal<AttachmentModel | null>(null);
  readonly renameSaving = computed(() => {
    const file = this.renaming();
    return !!file && this.pending().has(file.id);
  });

  constructor() {
    // The same component serves a task and then its subtask when the route changes under it.
    effect(() => {
      const projectId = this.projectId();
      const scopes = [this.ownScope(), this.subtasksScope()].filter((scope) => scope !== null);
      untracked(() => {
        const keys = new Set(scopes.map(attachmentListKey));
        this.clearLists([...this.loadedKeys].filter((key) => !keys.has(key)));
        this.loadedKeys = keys;
        scopes.forEach((scope) => this.load(projectId, scope));
      });
    });

    // Uploads go to the task on screen; the same tab serves a task and then its subtask.
    effect(() => {
      const task = this.task();
      const listKey = this.ownKey();
      untracked(() =>
        this.uploads.target.set({
          projectId: task.workProjectId,
          workTaskId: task.id,
          listKey,
          kind: task.isSubtask ? 'subtask' : 'task',
        }),
      );
    });

    this.actions
      .pipe(ofType(AttachmentsStoreActions.renameSuccess), takeUntilDestroyed())
      .subscribe(({ attachmentId }) => {
        if (this.renaming()?.id === attachmentId) this.renaming.set(null);
        this.snackBar.success('File renamed.');
      });
    this.actions
      .pipe(ofType(AttachmentsStoreActions.removeSuccess), takeUntilDestroyed())
      .subscribe(() => this.snackBar.success('File deleted.'));
    this.actions
      .pipe(
        ofType(AttachmentsStoreActions.renameFailure, AttachmentsStoreActions.removeFailure),
        takeUntilDestroyed(),
      )
      .subscribe(({ error, type }) => {
        const fallback =
          type === AttachmentsStoreActions.renameFailure.type
            ? 'The file could not be renamed. Try again.'
            : 'The file could not be deleted. Try again.';
        this.snackBar.error(error.message ?? fallback);
      });
  }

  ngOnDestroy(): void {
    this.clearLists([...this.loadedKeys]);
  }

  add(files: File[]): void {
    this.uploads.add(files, this.ownItems().length);
  }

  reload(): void {
    this.load(this.projectId(), this.ownScope());
  }

  save(file: AttachmentModel): void {
    this.files.save(this.projectId(), file);
  }

  rename(event: AttachmentRenameEvent): void {
    this.store.dispatch(
      AttachmentsStoreActions.rename({
        projectId: this.projectId(),
        attachmentId: event.attachment.id,
        baseName: event.baseName,
        fileName: event.fileName,
      }),
    );
  }

  confirmRemove(file: AttachmentModel): void {
    const kind = this.task().isSubtask ? 'subtask' : 'task';
    this.confirmation.confirm({
      key: 'attachmentDelete',
      header: 'Delete file?',
      message: `${file.fileName}\nIt will be removed from this ${kind}, its ticket and the project.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: confirmTone('danger'),
      accept: () =>
        this.store.dispatch(
          AttachmentsStoreActions.remove({ projectId: this.projectId(), attachmentId: file.id }),
        ),
    });
  }

  private clearLists(keys: string[]): void {
    keys.forEach((listKey) => this.store.dispatch(AttachmentsStoreActions.clearList({ listKey })));
  }

  private load(projectId: string, scope: AttachmentScope): void {
    this.store.dispatch(
      AttachmentsStoreActions.loadList({ listKey: attachmentListKey(scope), projectId, scope }),
    );
  }
}
