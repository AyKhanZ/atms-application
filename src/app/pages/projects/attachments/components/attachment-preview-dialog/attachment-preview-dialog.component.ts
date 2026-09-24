import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Observable, Subscription, from, switchMap } from 'rxjs';
import { AttachmentModel } from '../../../../../core/models/attachments';
import { attachmentPreviewKind } from '../../../../../core/utils/attachment.utils';
import { FileSizePipe } from '../../../../../shared/pipes/attachment.pipe';
import { SheetPreview, readSheets } from '../../attachment-content';
import { AttachmentFilesService, TextPreview } from '../../attachment-files.service';
import { AttachmentDocumentViewComponent } from '../attachment-document-view/attachment-document-view.component';
import { AttachmentSheetViewComponent } from '../attachment-sheet-view/attachment-sheet-view.component';

/**
 * Opens a file without leaving the page: images, PDF, text, Word (.docx), Excel and CSV. Open
 * while `attachment` is set. Everything is read from the file in the browser; nothing is sent to
 * a third-party viewer.
 */
@Component({
  selector: 'app-attachment-preview-dialog',
  imports: [
    ButtonModule,
    DialogModule,
    FileSizePipe,
    AttachmentDocumentViewComponent,
    AttachmentSheetViewComponent,
  ],
  templateUrl: './attachment-preview-dialog.component.html',
  styleUrl: './attachment-preview-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentPreviewDialogComponent {
  private readonly files = inject(AttachmentFilesService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly projectId = input.required<string>();
  readonly attachment = input<AttachmentModel | null>(null);
  readonly closed = output<void>();
  readonly download = output<AttachmentModel>();

  readonly kind = computed(() => {
    const file = this.attachment();
    return file ? attachmentPreviewKind(file) : null;
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** An object URL for an image or a PDF. */
  readonly url = signal<string | null>(null);
  /** Text is read and shown as text — never handed to the browser to render. */
  readonly text = signal<TextPreview | null>(null);
  readonly document = signal<Blob | null>(null);
  readonly sheets = signal<SheetPreview[] | null>(null);
  /** A blob URL made here a moment ago, never user input: safe to put in an iframe. */
  readonly frameUrl = computed<SafeResourceUrl | null>(() => {
    const url = this.url();
    return url && this.kind() === 'pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  private request: Subscription | null = null;

  constructor() {
    effect(() => {
      const attachment = this.attachment();
      const projectId = this.projectId();
      // Only the file drives this; what it produces must not re-run it.
      untracked(() => this.open(projectId, attachment));
    });

    inject(DestroyRef).onDestroy(() => this.release());
  }

  close(): void {
    this.release();
    this.closed.emit();
  }

  documentFailed(message: string): void {
    this.document.set(null);
    this.error.set(message);
  }

  private open(projectId: string, attachment: AttachmentModel | null): void {
    this.release();
    const kind = this.kind();
    if (!attachment || !kind) return;

    this.loading.set(true);
    this.error.set(null);
    const failed = (error: Error) => {
      this.error.set(error.message);
      this.loading.set(false);
    };
    const show = <T>(target: (value: T) => void) => ({
      next: (value: T) => {
        target(value);
        this.loading.set(false);
      },
      error: failed,
    });

    switch (kind) {
      case 'text':
        this.request = this.files
          .previewText(projectId, attachment)
          .subscribe(show((value) => this.text.set(value)));
        return;
      case 'document':
        this.request = this.files
          .previewBlob(projectId, attachment)
          .subscribe(show((value) => this.document.set(value)));
        return;
      case 'sheet':
        this.request = this.sheetsOf(projectId, attachment).subscribe(
          show((value) => this.sheets.set(value)),
        );
        return;
      default:
        this.request = this.files
          .previewUrl(projectId, attachment)
          .subscribe(show((value) => this.url.set(value)));
    }
  }

  private sheetsOf(projectId: string, attachment: AttachmentModel): Observable<SheetPreview[]> {
    const csv = attachment.contentType === 'text/csv';
    return this.files.previewBlob(projectId, attachment).pipe(
      switchMap((blob) =>
        from(
          blob
            .arrayBuffer()
            .then((buffer) => readSheets(buffer, csv))
            .catch(() => {
              throw new Error('This spreadsheet could not be shown. Download it to open it in Excel.');
            }),
        ),
      ),
    );
  }

  private release(): void {
    this.request?.unsubscribe();
    this.request = null;
    const url = this.url();
    if (url) URL.revokeObjectURL(url);
    this.url.set(null);
    this.text.set(null);
    this.document.set(null);
    this.sheets.set(null);
  }
}
