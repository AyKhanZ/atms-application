import { Injectable, computed, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { AttachmentUploadFilesService } from '../../../core/services/attachment-upload-files.service';
import {
  MAX_ATTACHMENTS_PER_TASK,
  attachmentFileError,
} from '../../../core/utils/attachment.utils';
import { AttachmentsStoreActions, AttachmentsStoreSelectors } from '../../../store/attachments';
import { RefusedAttachment } from './components/attachment-refused/attachment-refused.component';
import { AttachmentUploadRow } from './components/attachment-upload-list/attachment-upload-list.component';

/** The task or subtask files are added to. */
export interface AttachmentUploadTarget {
  projectId: string;
  workTaskId: string;
  listKey: string;
  kind: 'task' | 'subtask';
}

/**
 * Adding files to one task: what is refused before sending and why, what is on its way, and
 * Retry for what the network dropped. Provided by the tab, so it lives and goes with it; the
 * uploads themselves run in the store and finish even if the tab is left.
 */
@Injectable()
export class AttachmentUploadQueueService {
  private readonly store = inject(Store);
  private readonly files = inject(AttachmentUploadFilesService);
  private readonly uploads = this.store.selectSignal(AttachmentsStoreSelectors.getUploads);

  readonly target = signal<AttachmentUploadTarget | null>(null);

  /** Refused here, before sending: wrong type, empty, too big, or no room left on the task. */
  private readonly rejected = signal<RefusedAttachment[]>([]);
  private readonly mine = computed(() => {
    const target = this.target();
    return target ? this.uploads().filter((upload) => upload.listKey === target.listKey) : [];
  });

  /**
   * Only what is on its way, or stopped by the network and worth another try. A file the rules
   * refused is not a row: it never became an attachment and must not look like one.
   */
  readonly rows = computed<AttachmentUploadRow[]>(() =>
    this.mine()
      .filter((upload) => !upload.error || upload.retryable)
      .map((upload) => ({
        id: upload.uploadId,
        fileName: upload.fileName,
        size: upload.size,
        progress: upload.progress,
        error: upload.error,
        retryable: upload.retryable,
      })),
  );

  /** Refused here or by the server; one banner for all of them. */
  readonly refused = computed<RefusedAttachment[]>(() => [
    ...this.rejected(),
    ...this.mine()
      .filter((upload) => upload.error !== null && !upload.retryable)
      .map((upload) => ({
        id: upload.uploadId,
        fileName: upload.fileName,
        reason: upload.error ?? '',
      })),
  ]);

  /**
   * Any number of files at once; the only limit is the task's 100. Files past the room left are
   * refused here with that reason, in the same banner as a wrong type, instead of being sent to
   * fail one by one on the server.
   */
  add(chosen: File[], stored: number): void {
    const target = this.target();
    if (!target) return;

    // A new pick starts a new answer: the banner speaks only about the files just chosen.
    this.dismissRefused();
    const inFlight = this.mine().filter((upload) => !upload.error).length;
    let room = MAX_ATTACHMENTS_PER_TASK - stored - inFlight;

    const rejected: RefusedAttachment[] = [];
    for (const file of chosen) {
      const id = crypto.randomUUID();
      const reason =
        attachmentFileError(file) ??
        (room <= 0
          ? `This ${target.kind} can hold ${MAX_ATTACHMENTS_PER_TASK} files. Delete some to add more.`
          : null);
      if (reason) {
        rejected.push({ id, fileName: file.name, reason });
        continue;
      }
      room--;
      this.send(target, id, file);
    }
    this.rejected.set(rejected);
  }

  retry(uploadId: string): void {
    const target = this.target();
    const file = this.files.get(uploadId);
    if (!target || !file) return;

    this.dismiss(uploadId);
    this.send(target, crypto.randomUUID(), file);
  }

  /** Cancels a file in flight or forgets a failed or refused one. */
  dismiss(uploadId: string): void {
    this.rejected.update((rows) => rows.filter((row) => row.id !== uploadId));
    this.store.dispatch(AttachmentsStoreActions.dismissUpload({ uploadId }));
  }

  dismissRefused(): void {
    this.refused().forEach((item) => this.dismiss(item.id));
  }

  private send(target: AttachmentUploadTarget, uploadId: string, file: File): void {
    this.files.put(uploadId, file);
    this.store.dispatch(
      AttachmentsStoreActions.upload({
        uploadId,
        listKey: target.listKey,
        projectId: target.projectId,
        workTaskId: target.workTaskId,
        fileName: file.name,
        size: file.size,
      }),
    );
  }
}
