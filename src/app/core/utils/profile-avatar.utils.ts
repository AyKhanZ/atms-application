export function avatarErrorKey(errors: Record<string, unknown>): string {
  if (errors['fileType']) return 'validation.avatarType';
  if (errors['fileSize']) return 'validation.avatarSize';
  if (errors['fileNameLength']) return 'validation.avatarName';
  if (errors['imageDimensions']) return 'validation.avatarDimensions';
  return 'validation.avatarInvalid';
}
