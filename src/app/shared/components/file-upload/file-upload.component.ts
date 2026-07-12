import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, output, signal } from '@angular/core';
import { ValidationErrors } from '@angular/forms';
import { FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { ImageFileValidator } from '../../validators/image-file.validator';

export interface FileUploadValue {
  file: File | null;
  errors: ValidationErrors | null;
}

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule, FileUpload],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent implements OnDestroy {
  readonly imageValidator = inject(ImageFileValidator);

  readonly label = input('Image');
  readonly chooseLabel = input('Choose file');
  readonly previewAlt = input('Image preview');
  readonly existingFileName = input('');
  readonly existingPreviewUrl = input<string | null>(null);
  readonly resetKey = input<unknown>(null);
  readonly errorMessage = input('');

  readonly fileChange = output<FileUploadValue>();
  readonly fileRemove = output<void>();

  readonly accept = this.imageValidator.accept;
  readonly hint = this.imageValidator.hint;
  readonly selectedFileName = signal('');
  readonly previewUrl = signal<string | null>(null);
  readonly fileLabel = computed(() => this.selectedFileName() || this.existingFileName());

  private lastExistingPreviewUrl: string | null | undefined;
  private lastResetKey: unknown;

  constructor() {
    effect(() => {
      const existingPreviewUrl = this.existingPreviewUrl();
      const resetKey = this.resetKey();

      if (existingPreviewUrl === this.lastExistingPreviewUrl && resetKey === this.lastResetKey) {
        return;
      }

      this.lastExistingPreviewUrl = existingPreviewUrl;
      this.lastResetKey = resetKey;
      this.setPreview(existingPreviewUrl, true);
      this.selectedFileName.set('');
    });
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  async onFileSelected(event: FileSelectEvent, upload: FileUpload): Promise<void> {
    const file = event.files?.[0] ?? null;
    const errors = await this.imageValidator.validate(file);

    if (errors) {
      upload.clear();
      this.selectedFileName.set('');
      this.fileChange.emit({ file: null, errors });
      return;
    }

    this.selectedFileName.set(file?.name ?? '');
    this.setPreview(file ? URL.createObjectURL(file) : this.existingPreviewUrl(), true);
    this.fileChange.emit({ file, errors: null });
  }

  remove(upload?: FileUpload): void {
    upload?.clear();
    this.selectedFileName.set('');
    this.setPreview(null, true);
    this.fileChange.emit({ file: null, errors: null });
    this.fileRemove.emit();
  }

  private setPreview(url: string | null, revokePrevious: boolean): void {
    if (revokePrevious) {
      this.revokePreview();
    }

    this.previewUrl.set(url);
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url?.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}