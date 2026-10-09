import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { AttachmentModel } from '../../../core/models/attachments';
import { AttachmentsService } from '../../../core/services/attachments.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { decodeText } from './attachment-content';

// nothing changes, so straight to the api, not through the store
@Injectable({ providedIn: 'root' })
export class AttachmentFilesService {
  private readonly attachments = inject(AttachmentsService);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);

  download(projectId: string, attachment: AttachmentModel): Observable<void> {
    return this.attachments.getContent(projectId, attachment.id).pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName;
        link.click();
        // the browser already read the url, revoking next tick frees memory without cutting the download
        setTimeout(() => URL.revokeObjectURL(url));
      }),
      catchError((error: unknown) => throwError(() => new Error(this.contentErrorMessage(error)))),
    );
  }

  save(projectId: string, attachment: AttachmentModel): void {
    this.download(projectId, attachment).subscribe({
      error: (error: Error) => this.snackBar.error(error.message),
    });
  }

  // first megabyte only
  previewText(projectId: string, attachment: AttachmentModel): Observable<TextPreview> {
    return this.attachments.getContent(projectId, attachment.id, true).pipe(
      switchMap((blob) =>
        from(blob.slice(0, TEXT_PREVIEW_BYTES).arrayBuffer()).pipe(
          map((buffer) => ({ text: decodeText(buffer), truncated: blob.size > TEXT_PREVIEW_BYTES })),
        ),
      ),
      catchError((error: unknown) => throwError(() => new Error(this.contentErrorMessage(error)))),
    );
  }

  previewBlob(projectId: string, attachment: AttachmentModel): Observable<Blob> {
    return this.attachments.getContent(projectId, attachment.id).pipe(
      catchError((error: unknown) => throwError(() => new Error(this.contentErrorMessage(error)))),
    );
  }

  // caller revokes it
  previewUrl(projectId: string, attachment: AttachmentModel): Observable<string> {
    return this.attachments.getContent(projectId, attachment.id, true).pipe(
      map((blob) => URL.createObjectURL(new Blob([blob], { type: attachment.contentType }))),
      catchError((error: unknown) => throwError(() => new Error(this.contentErrorMessage(error)))),
    );
  }

  private contentErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return this.transloco.translate('attachments.unavailable');
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.transloco.translate('attachments.unreachable');
    }
    return this.transloco.translate('attachments.openFailed');
  }
}

const TEXT_PREVIEW_BYTES = 1024 * 1024;

export interface TextPreview {
  text: string;
  truncated: boolean;
}
