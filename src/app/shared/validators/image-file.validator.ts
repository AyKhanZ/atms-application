import { Injectable } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ImageFileValidator {
  readonly maxSizeBytes = 5 * 1024 * 1024;
  readonly maxFileNameLength = 120;
  readonly maxPixelCount = 12_000_000;
  readonly allowedExtensions = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp', 'png', 'webp'];
  readonly allowedTypes = ['image/jpeg', 'image/jfif', 'image/png', 'image/webp'];

  readonly accept = [
    ...this.allowedExtensions.map((extension) => `.${extension}`),
    ...this.allowedTypes,
  ].join(',');

  readonly hint = 'JPG, JPEG, JFIF, PNG or WEBP. Max 5 MB.';

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
      return 'Use JPG, JPEG, JFIF, PNG or WEBP image.';
    }

    if (errors['fileSize']) {
      return 'Image size must be 5 MB or less.';
    }

    if (errors['fileNameLength']) {
      return `File name must be ${this.maxFileNameLength} characters or less.`;
    }

    if (errors['imageDimensions']) {
      return 'Image dimensions are too large or invalid.';
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