import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { OrganizationListItemModel } from '../../../../../core/models/organizations/organizations.models';
import { ImageUrlService } from '../../../../../core/services/image-url.service';
import { FileUploadComponent, FileUploadValue } from '../../../../../shared/components/file-upload/file-upload.component';
import { ImageFileValidator } from '../../../../../shared/validators/image-file.validator';
import { OrganizationsStoreActions, OrganizationsStoreSelectors } from '../../../../../store/organizations';

@Component({
  selector: 'app-organization-create-dialog',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, FileUploadComponent],
  templateUrl: './organization-create-dialog.component.html',
  styleUrl: './organization-create-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly imageValidator = inject(ImageFileValidator);

  readonly visible = model.required<boolean>();
  readonly organization = input<OrganizationListItemModel | null>(null);
  readonly saved = output<void>();
  readonly submitted = signal(false);
  readonly imageTouched = signal(false);
  readonly isSaving = this.store.selectSignal(OrganizationsStoreSelectors.isSubmitted);
  readonly isEditMode = computed(() => Boolean(this.organization()?.id));
  readonly dialogTitle = computed(() => this.isEditMode() ? 'Edit' : 'Create');
  readonly submitLabel = computed(() => this.isEditMode() ? 'Save' : 'Create');
  readonly existingImageUrl = computed(() => this.imageUrlService.normalize(this.organization()?.logoPath));
  readonly existingImageFileName = computed(() => {
    const logoPath = this.organization()?.logoPath;
    return logoPath?.split('/').pop() ?? '';
  });

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    voen: ['', [Validators.required, Validators.maxLength(20)]],
    logo: [null as File | null],
  });

  private readonly requiredMessages: Record<keyof OrganizationCreateDialogComponent['form']['controls'], string> = {
    title: 'Title is required.',
    voen: 'VOEN is required.',
    logo: '',
  };

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.fillForm(this.organization());
      }
    });

    this.actions$
      .pipe(ofType(OrganizationsStoreActions.createOrganizationSuccess, OrganizationsStoreActions.updateOrganizationSuccess), takeUntilDestroyed())
      .subscribe(() => {
        this.resetForm();
        this.saved.emit();
        this.close();
      });
  }

  onImageChange(value: FileUploadValue): void {
    this.imageTouched.set(true);
    this.setImage(value.file, value.errors);
  }

  onImageRemoved(): void {
    this.imageTouched.set(false);
  }

  cancel(): void {
    if (this.isSaving()) {
      return;
    }

    this.resetForm();
    this.close();
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const title = (value.title ?? '').trim();
    const voen = (value.voen ?? '').trim();

    if (this.isEditMode()) {
      this.store.dispatch(OrganizationsStoreActions.updateOrganization({
        command: {
          id: this.organization()!.id,
          title,
          voen,
          logo: value.logo,
        },
      }));
      return;
    }

    this.store.dispatch(OrganizationsStoreActions.createOrganization({
      command: {
        title,
        voen,
        logo: value.logo,
      },
    }));
  }

  titleLength(): number {
    return this.form.controls.title.value?.length ?? 0;
  }

  voenLength(): number {
    return this.form.controls.voen.value?.length ?? 0;
  }

  hasError(controlName: keyof typeof this.form.controls): boolean {
    return Boolean(this.errorMessage(controlName));
  }

  errorMessage(controlName: keyof typeof this.form.controls): string {
    const shouldShow = this.submitted() || (controlName === 'logo' && this.imageTouched());
    if (!shouldShow) {
      return '';
    }

    const control = this.form.controls[controlName];
    if (!control.errors) {
      return '';
    }

    return this.getErrorMessage(controlName, control);
  }

  private fillForm(organization: OrganizationListItemModel | null): void {
    this.form.reset({
      title: organization?.title ?? '',
      voen: organization?.voen ?? '',
      logo: null,
    });
    this.submitted.set(false);
    this.imageTouched.set(false);
  }

  private setImage(file: File | null, errors: Record<string, boolean> | null): void {
    this.form.controls.logo.setValue(file);
    this.form.controls.logo.setErrors(errors);
  }

  private resetForm(): void {
    this.form.reset({ title: '', voen: '', logo: null });
    this.submitted.set(false);
    this.imageTouched.set(false);
  }

  private close(): void {
    this.visible.set(false);
  }

  private getErrorMessage(
    controlName: keyof OrganizationCreateDialogComponent['form']['controls'],
    control: AbstractControl,
  ): string {
    const errors = control.errors ?? {};

    if (errors['required']) {
      return this.requiredMessages[controlName];
    }

    if (errors['maxlength']) {
      return `Maximum ${errors['maxlength'].requiredLength} characters.`;
    }

    const imageError = this.imageValidator.errorMessage(errors);
    if (imageError) {
      return imageError;
    }

    return 'Invalid value.';
  }
}