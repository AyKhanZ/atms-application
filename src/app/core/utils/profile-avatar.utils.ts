export function avatarErrorMessage(errors: Record<string, unknown>): string {
  if (errors['fileType']) return 'Use JPG, JPEG, JFIF, PNG or WEBP image.';
  if (errors['fileSize']) return 'Image size must be 5 MB or less.';
  if (errors['fileNameLength']) return 'File name is too long.';
  if (errors['imageDimensions']) return 'Image dimensions are too large or invalid.';
  return 'Choose a valid profile photo.';
}
