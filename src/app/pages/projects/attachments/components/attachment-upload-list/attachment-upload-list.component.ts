import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import {
  AttachmentIconPipe,
  AttachmentTonePipe,
  FileSizePipe,
} from '../../../../../shared/pipes/attachment.pipe';

/** A file on its way up, or one that did not make it. */
export interface AttachmentUploadRow {
  id: string;
  fileName: string;
  size: number;
  progress: number;
  error: string | null;
  /** A network failure can be tried again; a refused type or size cannot. */
  retryable: boolean;
}

@Component({
  selector: 'app-attachment-upload-list',
  imports: [ButtonModule, AttachmentIconPipe, AttachmentTonePipe, FileSizePipe],
  templateUrl: './attachment-upload-list.component.html',
  styleUrl: './attachment-upload-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentUploadListComponent {
  readonly rows = input.required<AttachmentUploadRow[]>();
  readonly retry = output<string>();
  readonly dismiss = output<string>();
}
