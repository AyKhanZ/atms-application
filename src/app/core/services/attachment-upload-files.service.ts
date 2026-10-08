import { Injectable } from '@angular/core';

// File isnt plain data (shows as {} in devtools, cant replay), so store keeps id/name/size and the File lives here
// dropped once it lands, is refused or dismissed
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
