import { Injectable, inject } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class ImageFileValidator {
  private readonly transloco = inject(TranslocoService);

  readonly maxSizeBytes = 5 * 1024 * 1024;
  readonly maxFileNameLength = 120;
  readonly maxPixelCount = 12_000_000;
  readonly allowedExtensions = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'webp'];
  readonly allowedTypes = ['image/jpeg', 'image/jfif', 'image/png', 'image/webp'];

  readonly accept = [
    ...this.allowedExtensions.map((extension) => `.${extension}`),
    ...this.allowedTypes,
  ].join(',');

  get hint(): string {
    return this.transloco.translate('common.imageHint');
  }

  async validate(file: File | null): Promise<ValidationErrors | null> {
    if (!file) {
      return null;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const hasAllowedExtension = this.allowedExtensions.includes(extension);
    const hasAllowedMimeType = this.allowedTypes.includes(file.type);

    if (!hasAllowedExtension || !hasAllowedMimeType) {
      return { fileType: true };
    }

    if (file.size > this.maxSizeBytes) {
      return { fileSize: true };
    }

    if (file.name.length > this.maxFileNameLength) {
      return { fileNameLength: true };
    }

    const dimensionsAreValid = await this.hasValidDimensions(file);
    if (!dimensionsAreValid) {
      return { imageDimensions: true };
    }

    return null;
  }

  errorMessage(errors: ValidationErrors | null | undefined): string {
    if (!errors) {
      return '';
    }

    if (errors['fileType']) {
      return this.transloco.translate('validation.avatarType');
    }

    if (errors['fileSize']) {
      return this.transloco.translate('validation.avatarSize');
    }

    if (errors['fileNameLength']) {
      return this.transloco.translate('validation.fileNameMax', { max: this.maxFileNameLength });
    }

    if (errors['imageDimensions']) {
      return this.transloco.translate('validation.avatarDimensions');
    }

    return '';
  }

  private hasValidDimensions(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image.width * image.height <= this.maxPixelCount);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      image.src = url;
    });
  }
}
