import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { attachmentIcon, attachmentTone, formatFileSize } from '../../core/utils/attachment.utils';

// 512 B, 38 KB, 2.4 MB
@Pipe({ name: 'fileSize' })
export class FileSizePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(bytes: number): string {
    return formatFileSize(bytes, (key, params) => this.transloco.translate(key, params));
  }
}

@Pipe({ name: 'attachmentIcon' })
export class AttachmentIconPipe implements PipeTransform {
  transform(fileName: string): string {
    return attachmentIcon(fileName);
  }
}

@Pipe({ name: 'attachmentTone' })
export class AttachmentTonePipe implements PipeTransform {
  transform(fileName: string): string {
    return attachmentTone(fileName);
  }
}
