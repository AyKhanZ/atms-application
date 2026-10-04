import { avatarErrorMessage } from './profile-avatar.utils';

describe('avatarErrorMessage', () => {
  it.each([
    [{ fileType: true }, 'Use JPG, JPEG, JFIF, PNG or WEBP image.'],
    [{ fileSize: true }, 'Image size must be 5 MB or less.'],
    [{ fileNameLength: true }, 'File name is too long.'],
    [{ imageDimensions: true }, 'Image dimensions are too large or invalid.'],
    [{ somethingElse: true }, 'Choose a valid profile photo.'],
  ])('explains %o', (errors, message) => {
    expect(avatarErrorMessage(errors)).toBe(message);
  });
});
