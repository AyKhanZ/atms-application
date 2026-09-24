import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { AttachmentModel } from '../../../core/models/attachments';
import { AttachmentsService } from '../../../core/services/attachments.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { decodeText } from './attachment-content';

/**
 * Opening and saving a file. Neither changes anything, so they go straight to the API rather
 * than through the store.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentFilesService {
  private readonly attachments = inject(AttachmentsService);
  private readonly snackBar = inject(SnackBarService);

  /** Saves the file under its own name. Errors carry a message ready for the user. */
  download(projectId: string, attachment: AttachmentModel): Observable<void> {
    return this.attachments.getContent(projectId, attachment.id).pipe(
      map((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName;
        link.click();
        // The browser has read the URL by the time the click returns; revoking it on the next
        // turn frees the memory without cutting the download short.
        setTimeout(() => URL.revokeObjectURL(url));
      }),
      catchError((error: unknown) => throwError(() => new Error(contentErrorMessage(error)))),
    );
  }

  /** Download started from a row or a dialog: a failure is told in a snack bar, nothing else. */
  save(projectId: string, attachment: AttachmentModel): void {
    this.download(projectId, attachment).subscribe({
      error: (error: Error) => this.snackBar.error(error.message),
    });
  }

  /** The first megabyte of a text file, decoded, for the preview dialog. */
  previewText(projectId: string, attachment: AttachmentModel): Observable<TextPreview> {
    return this.attachments.getContent(projectId, attachment.id, true).pipe(
      switchMap((blob) =>
        from(blob.slice(0, TEXT_PREVIEW_BYTES).arrayBuffer()).pipe(
          map((buffer) => ({ text: decodeText(buffer), truncated: blob.size > TEXT_PREVIEW_BYTES })),
        ),
      ),
      catchError((error: unknown) => throwError(() => new Error(contentErrorMessage(error)))),
    );
  }

  /** The file as it is, for a document or a sheet drawn in the preview. */
  previewBlob(projectId: string, attachment: AttachmentModel): Observable<Blob> {
    return this.attachments.getContent(projectId, attachment.id).pipe(
      catchError((error: unknown) => throwError(() => new Error(contentErrorMessage(error)))),
    );
  }

  /** An object URL for the preview dialog. The caller revokes it. */
  previewUrl(projectId: string, attachment: AttachmentModel): Observable<string> {
    return this.attachments.getContent(projectId, attachment.id, true).pipe(
      map((blob) => URL.createObjectURL(new Blob([blob], { type: attachment.contentType }))),
      catchError((error: unknown) => throwError(() => new Error(contentErrorMessage(error)))),
    );
  }
}

/** A text file is shown, not scrolled through: past this the rest is a download away. */
const TEXT_PREVIEW_BYTES = 1024 * 1024;

export interface TextPreview {
  text: string;
  truncated: boolean;
}

function contentErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'This file is no longer available.';
  }
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'The server could not be reached. Check the connection and try again.';
  }
  return 'The file could not be opened. Try again.';
}
