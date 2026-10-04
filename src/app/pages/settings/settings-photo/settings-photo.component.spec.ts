import { TestBed } from '@angular/core/testing';
import { FileUploadValue } from '../../../shared/components/file-upload/file-upload.component';
import { ImageFileValidator } from '../../../shared/validators/image-file.validator';
import { SettingsPhotoComponent } from './settings-photo.component';

describe('SettingsPhotoComponent', () => {
  let validate: ReturnType<typeof vi.fn>;

  const create = () => {
    const fixture = TestBed.createComponent(SettingsPhotoComponent);
    fixture.componentRef.setInput('imageUrl', 'http://api/app/images/users/old.png');
    fixture.detectChanges();
    const emitted: FileUploadValue[] = [];
    fixture.componentInstance.fileChange.subscribe((value) => emitted.push(value));
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="file"]',
    )!;
    return { fixture, emitted, input };
  };

  const pick = async (input: HTMLInputElement, file: File) => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(async () => {
    validate = vi.fn(() => Promise.resolve(null));
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();

    await TestBed.configureTestingModule({
      imports: [SettingsPhotoComponent],
      providers: [
        { provide: ImageFileValidator, useValue: { validate, accept: 'image/png', hint: '' } },
      ],
    }).compileComponents();
  });

  it('opens the file picker when the page asks for it', () => {
    const { fixture, input } = create();
    const click = vi.spyOn(input, 'click');

    fixture.componentInstance.choose();

    expect(click).toHaveBeenCalled();
  });

  it('previews a valid photo and hands it to the form', async () => {
    const { fixture, emitted, input } = create();
    const file = new File(['x'], 'me.png', { type: 'image/png' });

    await pick(input, file);

    expect(emitted).toEqual([{ file, errors: null }]);
    expect(fixture.componentInstance.shownUrl()).toBe('blob:preview');
  });

  it('reports an invalid photo and keeps showing the saved one', async () => {
    validate.mockResolvedValue({ fileSize: true });
    const { fixture, emitted, input } = create();

    await pick(input, new File(['x'], 'huge.png'));

    expect(emitted).toEqual([{ file: null, errors: { fileSize: true } }]);
    expect(fixture.componentInstance.shownUrl()).toBe('http://api/app/images/users/old.png');
  });

  it('drops the chosen photo when the page resets it after Save or Discard', async () => {
    const { fixture, input } = create();
    await pick(input, new File(['x'], 'me.png'));

    fixture.componentRef.setInput('resetKey', 1);
    fixture.detectChanges();

    expect(fixture.componentInstance.shownUrl()).toBe('http://api/app/images/users/old.png');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
