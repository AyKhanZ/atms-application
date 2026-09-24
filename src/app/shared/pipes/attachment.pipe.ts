import { Pipe, PipeTransform } from '@angular/core';
import {
  attachmentIcon,
  attachmentTone,
  formatFileSize,
} from '../../core/utils/attachment.utils';

/** 512 B, 38 KB, 2.4 MB. */
@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    return formatFileSize(bytes);
  }
}

/** The PrimeIcons class for a file, by its extension. */
@Pipe({ name: 'attachmentIcon' })
export class AttachmentIconPipe implements PipeTransform {
  transform(fileName: string): string {
    return attachmentIcon(fileName);
  }
}

/** pdf, document, sheet, image, archive or other — the `--file-*` colour of the icon tile. */
@Pipe({ name: 'attachmentTone' })
export class AttachmentTonePipe implements PipeTransform {
  transform(fileName: string): string {
    return attachmentTone(fileName);
  }
}
