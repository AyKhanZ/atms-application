import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FileUploadValue } from '../../../shared/components/file-upload/file-upload.component';
import { ProfileAvatarComponent } from '../../../shared/components/profile-avatar/profile-avatar.component';
import { ImageFileValidator } from '../../../shared/validators/image-file.validator';

/**
 * The photo on the Profile tab. The page's Change photo button calls `choose()`; the new photo is
 * only previewed here and goes to the server with the rest of the profile on Save. There is no
 * "remove": a profile photo is required.
 */
@Component({
  selector: 'app-settings-photo',
  imports: [ProfileAvatarComponent],
  templateUrl: './settings-photo.component.html',
  styleUrl: './settings-photo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPhotoComponent implements OnDestroy {
  private readonly validator = inject(ImageFileValidator);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  /** The photo saved on the server. */
  readonly imageUrl = input<string | null>(null);
  readonly fullName = input('');
  readonly initials = input('');
  /** Changing it drops the chosen file and shows the saved photo again (after Save or Discard). */
  readonly resetKey = input<unknown>(null);
  readonly fileChange = output<FileUploadValue>();

  readonly accept = this.validator.accept;
  private readonly chosenPreview = signal<string | null>(null);
  readonly shownUrl = computed(() => this.chosenPreview() ?? this.imageUrl());

  constructor() {
    effect(() => {
      this.resetKey();
      this.clearChosen();
    });
  }

  ngOnDestroy(): void {
    this.clearChosen();
  }

  choose(): void {
    this.fileInput().nativeElement.click();
  }

  async onSelected(): Promise<void> {
    const input = this.fileInput().nativeElement;
    const file = input.files?.[0] ?? null;
    // Reset so that picking the same file again still fires `change`.
    input.value = '';
    if (!file) return;

    const errors = await this.validator.validate(file);
    if (errors) {
      this.fileChange.emit({ file: null, errors });
      return;
    }

    this.clearChosen();
    this.chosenPreview.set(URL.createObjectURL(file));
    this.fileChange.emit({ file, errors: null });
  }

  private clearChosen(): void {
    const url = this.chosenPreview();
    if (url) URL.revokeObjectURL(url);
    this.chosenPreview.set(null);
  }
}
