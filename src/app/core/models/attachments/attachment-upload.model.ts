export interface AttachmentUploadModel {
  uploadId: string;
  listKey: string;
  fileName: string;
  size: number;
  // 0-100
  progress: number;
  error: string | null;
  // network error can be retried, refused type or size cant
  retryable: boolean;
}
