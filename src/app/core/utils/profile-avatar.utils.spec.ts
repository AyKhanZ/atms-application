import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { translocoTestingProviders } from '../testing/transloco-testing';
import { avatarErrorKey } from './profile-avatar.utils';

describe('avatarErrorKey', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...translocoTestingProviders()] });
  });

  it.each([
    [{ fileType: true }, 'Use JPG, JPEG, JFIF, PNG or WEBP image.'],
    [{ fileSize: true }, 'Image size must be 5 MB or less.'],
    [{ fileNameLength: true }, 'File name is too long.'],
    [{ imageDimensions: true }, 'Image dimensions are too large or invalid.'],
    [{ somethingElse: true }, 'Choose a valid profile photo.'],
  ])('explains %o', (errors, message) => {
    const transloco = TestBed.inject(TranslocoService);
    expect(transloco.translate(avatarErrorKey(errors))).toBe(message);
  });
});
