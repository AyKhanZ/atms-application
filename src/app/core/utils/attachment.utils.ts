import { AttachmentScope } from '../models/attachments';

// same as server AttachmentsOptions, server checks everything again
export const MAX_ATTACHMENT_SIZE_MB = 25;
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TASK = 100;
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

export const ATTACHMENT_TYPES = ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`).join(', ');

export type AttachmentTranslate = (key: string, params?: Record<string, string | number>) => string;

const INVALID_NAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]/;

// types not here are downloaded
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

// "Report.v2.pdf" -> { base: "Report.v2", extension: ".pdf" }
export function splitFileName(fileName: string): { base: string; extension: string } {
  const dot = fileName.lastIndexOf('.');
  return dot > 0
    ? { base: fileName.slice(0, dot), extension: fileName.slice(dot) }
    : { base: fileName, extension: '' };
}

export function fileExtension(fileName: string): string {
  return splitFileName(fileName).extension.slice(1).toLowerCase();
}

// 512 B, 38 KB, 2.4 MB — the unit is a translation, the number stays a parameter
export function formatFileSize(bytes: number, translate: AttachmentTranslate): string {
  if (bytes < 1024) return translate('attachments.size.b', { count: bytes });
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return translate('attachments.size.kb', { count: Math.round(kilobytes) });
  const megabytes = kilobytes / 1024;
  const size = megabytes < 10 ? megabytes.toFixed(1) : String(Math.round(megabytes));
  return translate('attachments.size.mb', { size });
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

// docx/xlsx is a zip unpacked in the browser, a crafted 25MB file can unpack to gigabytes and kill the tab
export const MAX_OFFICE_PREVIEW_BYTES = 10 * 1024 * 1024;

// old .doc and powerpoint have no browser reader, downloaded
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

// null = ok, the server checks the content too
export function attachmentFileError(file: File, translate: AttachmentTranslate): string | null {
  if (!ATTACHMENT_EXTENSIONS.includes(fileExtension(file.name))) {
    return translate('attachments.typeUnsupported');
  }
  if (file.size === 0) return translate('attachments.emptyFile');
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return translate('attachments.tooLarge', {
      size: formatFileSize(MAX_ATTACHMENT_SIZE_BYTES, translate),
    });
  }
  return null;
}

export function attachmentNameError(baseName: string, translate: AttachmentTranslate): string | null {
  const name = baseName.trim();
  if (!name) return translate('attachments.nameRequired');
  if (name.length > MAX_ATTACHMENT_BASE_NAME_LENGTH) {
    return translate('attachments.nameTooLong', { max: MAX_ATTACHMENT_BASE_NAME_LENGTH });
  }
  if (INVALID_NAME_CHARACTERS.test(name)) return translate('attachments.nameChars');
  return null;
}
