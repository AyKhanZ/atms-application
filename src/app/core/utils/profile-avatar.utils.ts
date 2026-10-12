import { HttpErrorResponse } from '@angular/common/http';
import { validationErrorFor } from './http-error.utils';

export function avatarErrorKey(errors: Record<string, unknown>): string {
  if (errors['fileType']) return 'validation.avatarType';
  if (errors['fileSize']) return 'validation.avatarSize';
  if (errors['fileNameLength']) return 'validation.avatarName';
  if (errors['imageDimensions']) return 'validation.avatarDimensions';
  return 'validation.avatarInvalid';
}

// the validator names a missing photo Avatar, image storage names a refused file Image
export function avatarServerError(error: HttpErrorResponse): string | null {
  return validationErrorFor(error, 'Avatar') ?? validationErrorFor(error, 'Image');
}
