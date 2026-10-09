import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
import { AttachmentUploadFilesService } from '../../../core/services/attachment-upload-files.service';
import {
  MAX_ATTACHMENTS_PER_TASK,
  attachmentFileError,
} from '../../../core/utils/attachment.utils';
import { AttachmentsStoreActions, AttachmentsStoreSelectors } from '../../../store/attachments';
import { RefusedAttachment } from './components/attachment-refused/attachment-refused.component';
import { AttachmentUploadRow } from './components/attachment-upload-list/attachment-upload-list.component';

export interface AttachmentUploadTarget {
  projectId: string;
  workTaskId: string;
  listKey: string;
  kind: 'task' | 'subtask';
}

// provided by the tab, uploads run in the store and finish even if the tab is left
@Injectable()
export class AttachmentUploadQueueService {
  private readonly store = inject(Store);
  private readonly files = inject(AttachmentUploadFilesService);
  private readonly transloco = inject(TranslocoService);
  private readonly uploads = this.store.selectSignal(AttachmentsStoreSelectors.getUploads);

  readonly target = signal<AttachmentUploadTarget | null>(null);

  // wrong type, empty, too big or no room left
  private readonly rejected = signal<RefusedAttachment[]>([]);
  private readonly mine = computed(() => {
    const target = this.target();
    return target ? this.uploads().filter((upload) => upload.listKey === target.listKey) : [];
  });

  // refused files are not rows, they never became attachments
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

  // only limit is 100 per task, files over it are refused here instead of failing one by one on the server
  add(chosen: File[], stored: number): void {
    const target = this.target();
    if (!target) return;

    // banner speaks only about the files just picked
    this.dismissRefused();
    const inFlight = this.mine().filter((upload) => !upload.error).length;
    let room = MAX_ATTACHMENTS_PER_TASK - stored - inFlight;

    const rejected: RefusedAttachment[] = [];
    for (const file of chosen) {
      const id = crypto.randomUUID();
      const translate = (key: string, params?: Record<string, string | number>) =>
        this.transloco.translate(key, params);
      const reason =
        attachmentFileError(file, translate) ??
        (room <= 0
          ? translate(target.kind === 'subtask' ? 'attachments.roomSubtask' : 'attachments.roomTask', {
              max: MAX_ATTACHMENTS_PER_TASK,
            })
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
