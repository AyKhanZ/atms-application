import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../../../core/i18n/active-language';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { OrganizationListItemModel } from '../../../../../core/models/organizations/organizations.models';
import { ImageUrlService } from '../../../../../core/services/image-url.service';
import {
  FileUploadComponent,
  FileUploadValue,
} from '../../../../../shared/components/file-upload/file-upload.component';
import { ImageFileValidator } from '../../../../../shared/validators/image-file.validator';
import {
  OrganizationsStoreActions,
  OrganizationsStoreSelectors,
} from '../../../../../store/organizations';

type OrganizationField = 'title' | 'voen' | 'logo';

// the api names fields in PascalCase (Title, Voen, Logo)
const organizationFieldsByServerName: Record<string, OrganizationField> = {
  title: 'title',
  voen: 'voen',
  logo: 'logo',
};

@Component({
  selector: 'app-organization-create-dialog',
  imports: [
    TooltipModule,
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FileUploadComponent,
    TranslocoDirective,
  ],
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
  private readonly transloco = inject(TranslocoService);

  readonly visible = model.required<boolean>();
  readonly organization = input<OrganizationListItemModel | null>(null);
  readonly saved = output<void>();
  readonly submitted = signal(false);
  readonly imageTouched = signal(false);
  readonly serverError = signal<{ field: OrganizationField; message: string } | null>(null);
  readonly isSaving = this.store.selectSignal(OrganizationsStoreSelectors.isSubmitted);
  readonly isEditMode = computed(() => Boolean(this.organization()?.id));
  readonly dialogTitle = computed(() => {
    currentLanguage();
    return this.transloco.translate(this.isEditMode() ? 'common.edit' : 'common.create');
  });
  readonly submitLabel = computed(() => {
    currentLanguage();
    return this.transloco.translate(this.isEditMode() ? 'common.save' : 'common.create');
  });
  readonly existingImageUrl = computed(() =>
    this.imageUrlService.normalize(this.organization()?.logoPath),
  );
  readonly existingImageFileName = computed(() => {
    const logoPath = this.organization()?.logoPath;
    return logoPath?.split('/').pop() ?? '';
  });

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    voen: ['', [Validators.required, Validators.maxLength(20)]],
    logo: [null as File | null],
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.fillForm(this.organization());
      }
    });

    this.actions$
      .pipe(
        ofType(
          OrganizationsStoreActions.createOrganizationSuccess,
          OrganizationsStoreActions.updateOrganizationSuccess,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.resetForm();
        this.saved.emit();
        this.close();
      });

    // a taken title or tax id comes back as a 400 with the field name; it goes under that field
    this.actions$
      .pipe(
        ofType(
          OrganizationsStoreActions.createOrganizationFailure,
          OrganizationsStoreActions.updateOrganizationFailure,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ error, field }) => {
        const formField = organizationFieldsByServerName[field?.toLowerCase() ?? ''];
        this.serverError.set(
          error.message && formField ? { field: formField, message: error.message } : null,
        );
      });

    for (const field of Object.values(organizationFieldsByServerName)) {
      const control: AbstractControl = this.form.controls[field];
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        if (this.serverError()?.field === field) {
          this.serverError.set(null);
        }
      });
    }
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
      this.store.dispatch(
        OrganizationsStoreActions.updateOrganization({
          command: {
            id: this.organization()!.id,
            title,
            voen,
            logo: value.logo,
          },
        }),
      );
      return;
    }

    this.store.dispatch(
      OrganizationsStoreActions.createOrganization({
        command: {
          title,
          voen,
          logo: value.logo,
        },
      }),
    );
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
    const serverError = this.serverError();
    if (serverError?.field === controlName) {
      return serverError.message;
    }

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
    this.serverError.set(null);
  }

  private setImage(file: File | null, errors: Record<string, boolean> | null): void {
    this.form.controls.logo.setValue(file);
    this.form.controls.logo.setErrors(errors);
  }

  private resetForm(): void {
    this.form.reset({ title: '', voen: '', logo: null });
    this.submitted.set(false);
    this.imageTouched.set(false);
    this.serverError.set(null);
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
      const key = {
        title: 'validation.titleRequired',
        voen: 'validation.voenRequired',
        logo: '',
      }[controlName];
      return key ? this.transloco.translate(key) : '';
    }

    if (errors['maxlength']) {
      return this.transloco.translate('validation.maxLength', {
        max: errors['maxlength'].requiredLength,
      });
    }

    const imageError = this.imageValidator.errorMessage(errors);
    if (imageError) {
      return imageError;
    }

    return this.transloco.translate('common.invalid');
  }
}
