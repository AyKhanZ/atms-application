import { Injectable } from '@angular/core';

/**
 * The files being uploaded, by upload id. A `File` is a browser object, not data: kept in an
 * action it shows as `{}` in the DevTools and cannot be replayed, so the store carries only the
 * id, name and size, and the effect takes the file from here.
 *
 * A file stays while it may still be sent — in flight, or failed on the network and waiting for
 * Retry — and is dropped once it lands, is refused or is dismissed.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentUploadFilesService {
  private readonly files = new Map<string, File>();

  put(uploadId: string, file: File): void {
    this.files.set(uploadId, file);
  }

  get(uploadId: string): File | undefined {
    return this.files.get(uploadId);
  }

  delete(uploadId: string): void {
    this.files.delete(uploadId);
  }

  clear(): void {
    this.files.clear();
  }
}
