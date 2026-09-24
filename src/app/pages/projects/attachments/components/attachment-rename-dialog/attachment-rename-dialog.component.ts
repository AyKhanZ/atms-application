import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AttachmentModel } from '../../../../../core/models/attachments';
import {
  MAX_ATTACHMENT_BASE_NAME_LENGTH,
  attachmentNameError,
  splitFileName,
} from '../../../../../core/utils/attachment.utils';

export interface AttachmentRenameEvent {
  attachment: AttachmentModel;
  baseName: string;
  fileName: string;
}

/** Only the name before the extension is editable: the type was checked when it was uploaded. */
@Component({
  selector: 'app-attachment-rename-dialog',
  imports: [FormsModule, ButtonModule, DialogModule, InputTextModule],
  templateUrl: './attachment-rename-dialog.component.html',
  styleUrl: './attachment-rename-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentRenameDialogComponent {
  readonly attachment = input<AttachmentModel | null>(null);
  readonly saving = input(false);
  readonly renamed = output<AttachmentRenameEvent>();
  readonly closed = output<void>();

  protected readonly maxLength = MAX_ATTACHMENT_BASE_NAME_LENGTH;
  readonly baseName = signal('');
  readonly touched = signal(false);
  readonly extension = computed(() => splitFileName(this.attachment()?.fileName ?? '').extension);
  readonly error = computed(() => attachmentNameError(this.baseName()));

  constructor() {
    effect(() => {
      const attachment = this.attachment();
      untracked(() => {
        this.baseName.set(attachment ? splitFileName(attachment.fileName).base : '');
        this.touched.set(false);
      });
    });
  }

  submit(): void {
    const attachment = this.attachment();
    this.touched.set(true);
    if (!attachment || this.error() || this.saving()) return;

    const baseName = this.baseName().trim();
    if (`${baseName}${this.extension()}` === attachment.fileName) {
      this.closed.emit();
      return;
    }
    this.renamed.emit({ attachment, baseName, fileName: `${baseName}${this.extension()}` });
  }

  close(): void {
    if (!this.saving()) this.closed.emit();
  }
}
