import { AttachmentScope } from '../models/attachments';

/** Mirrors `AttachmentsOptions` on the server, which checks every rule again. */
export const MAX_ATTACHMENT_SIZE_MB = 25;
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
/** Files one task or subtask can hold, as the server allows it. */
export const MAX_ATTACHMENTS_PER_TASK = 100;
/** Longest name before the extension, as the server allows it. */
export const MAX_ATTACHMENT_BASE_NAME_LENGTH = 200;

export const ATTACHMENT_EXTENSIONS: readonly string[] = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'txt',
  'csv',
  'zip',
];

export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(
  ',',
);

/** Size first: it is the rule people run into. Office types by the names clients know them by. */
export const ATTACHMENT_HINT = `Up to ${MAX_ATTACHMENT_SIZE_MB} MB each · PDF, Word, Excel, PowerPoint, images, text, ZIP`;

/** The exact list, for the hint's tooltip. */
export const ATTACHMENT_TYPES_TITLE = `Allowed: ${ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(', ')}`;

const INVALID_NAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/;

/** How a file opens in the preview; a type missing here is downloaded instead. */
export type AttachmentPreviewKind = 'image' | 'pdf' | 'text' | 'document' | 'sheet';

const PREVIEW_KINDS: Readonly<Record<string, AttachmentPreviewKind>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'text/plain': 'text',
  'text/csv': 'sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'sheet',
  'application/vnd.ms-excel': 'sheet',
};

export function attachmentListKey(scope: AttachmentScope): string {
  switch (scope.kind) {
    case 'task':
      return `task:${scope.workTaskId}`;
    case 'subtasks':
      return `subtasks:${scope.parentWorkTaskId}`;
    case 'ticket':
      return `ticket:${scope.workTicketId}`;
  }
}

/** "Report.v2.pdf" → { base: "Report.v2", extension: ".pdf" }. */
export function splitFileName(fileName: string): { base: string; extension: string } {
  const dot = fileName.lastIndexOf('.');
  return dot > 0
    ? { base: fileName.slice(0, dot), extension: fileName.slice(dot) }
    : { base: fileName, extension: '' };
}

export function fileExtension(fileName: string): string {
  return splitFileName(fileName).extension.slice(1).toLowerCase();
}

/** 512 B, 38 KB, 2.4 MB — one decimal only where it carries information. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  const megabytes = kilobytes / 1024;
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`;
}

export function attachmentIcon(fileName: string): string {
  switch (fileExtension(fileName)) {
    case 'pdf':
      return 'pi-file-pdf';
    case 'doc':
    case 'docx':
    case 'odt':
      return 'pi-file-word';
    case 'txt':
      return 'pi-align-left';
    case 'xls':
    case 'xlsx':
    case 'ods':
    case 'csv':
      return 'pi-file-excel';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'gif':
      return 'pi-image';
    case 'zip':
      return 'pi-box';
    default:
      return 'pi-file';
  }
}

/** Which `--file-*` colour the icon tile takes. */
export function attachmentTone(fileName: string): string {
  switch (attachmentIcon(fileName)) {
    case 'pi-file-pdf':
      return 'pdf';
    case 'pi-file-word':
      return 'document';
    case 'pi-file-excel':
      return 'sheet';
    case 'pi-image':
      return 'image';
    case 'pi-box':
      return 'archive';
    default:
      return 'other';
  }
}

/**
 * A .docx or a spreadsheet is a zip unpacked in the browser to be drawn. Past this size it is only
 * downloaded: a crafted 25 MB archive can unpack to gigabytes and take the tab down with it.
 */
export const MAX_OFFICE_PREVIEW_BYTES = 10 * 1024 * 1024;

/**
 * Images, PDF and text the browser shows itself; .docx and Excel are drawn from the file in the
 * browser. The old binary .doc and PowerPoint have no such reader and are downloaded.
 */
export function attachmentPreviewKind(file: {
  contentType: string;
  size: number;
}): AttachmentPreviewKind | null {
  const kind = PREVIEW_KINDS[file.contentType] ?? null;
  const unpacked = kind === 'document' || (kind === 'sheet' && file.contentType !== 'text/csv');
  return unpacked && file.size > MAX_OFFICE_PREVIEW_BYTES ? null : kind;
}

export function canPreviewAttachment(file: { contentType: string; size: number }): boolean {
  return attachmentPreviewKind(file) !== null;
}

/** Why the file cannot be sent, or null. The server checks the content as well. */
export function attachmentFileError(file: File): string | null {
  if (!ATTACHMENT_EXTENSIONS.includes(fileExtension(file.name))) {
    return "This file type isn't supported. Use PDF, Word, Excel, PowerPoint, images, text or ZIP.";
  }
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `This file is larger than ${MAX_ATTACHMENT_SIZE_MB} MB.`;
  }
  return null;
}

/** Why the new name cannot be saved, or null. */
export function attachmentNameError(baseName: string): string | null {
  const name = baseName.trim();
  if (!name) return 'Enter a file name.';
  if (name.length > MAX_ATTACHMENT_BASE_NAME_LENGTH) {
    return `The file name must be ${MAX_ATTACHMENT_BASE_NAME_LENGTH} characters or fewer.`;
  }
  if (INVALID_NAME_CHARACTERS.test(name)) {
    return 'The file name can\'t contain \\ / : * ? " < > |';
  }
  return null;
}
