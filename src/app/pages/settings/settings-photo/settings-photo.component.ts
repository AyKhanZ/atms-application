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

// only previewed here, goes to the server with the profile on Save; no "remove", photo is required
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

  readonly imageUrl = input<string | null>(null);
  readonly fullName = input('');
  readonly initials = input('');
  // changing it drops the picked file and shows the saved photo (after Save or Discard)
  readonly resetKey = input<unknown>(null);
  readonly fileChange = output<FileUploadValue>();

  readonly accept = this.validator.accept;
  private readonly chosenPreview = signal<string | null>(null);
  readonly shownUrl = computed(() => this.chosenPreview() ?? this.imageUrl());
  // image check is async, an older or late check must not replace the current pick
  private selection = 0;

  constructor() {
    effect(() => {
      this.resetKey();
      this.selection++;
      this.clearChosen();
    });
  }

  ngOnDestroy(): void {
    // otherwise a running check creates a preview url nobody frees
    this.selection++;
    this.clearChosen();
  }

  choose(): void {
    this.fileInput().nativeElement.click();
  }

  async onSelected(): Promise<void> {
    const input = this.fileInput().nativeElement;
    const file = input.files?.[0] ?? null;
    // so picking the same file again still fires change
    input.value = '';
    if (!file) return;

    const selection = ++this.selection;
    const errors = await this.validator.validate(file);
    if (selection !== this.selection) return;

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
