/** A file on its way to the server, shown as a row with progress until it lands or fails. */
export interface AttachmentUploadModel {
  uploadId: string;
  listKey: string;
  fileName: string;
  size: number;
  /** 0–100. */
  progress: number;
  error: string | null;
  /** A failure worth sending again; a refusal (type, size, content) is not. */
  retryable: boolean;
}
