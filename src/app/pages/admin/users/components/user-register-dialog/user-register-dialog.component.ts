import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { SortDirectionEnum } from '../../../../../core/enums/sort-direction.enum';
import { OrganizationListItemModel } from '../../../../../core/models/organizations/organizations.models';
import { ImageUrlService } from '../../../../../core/services/image-url.service';
import { OrganizationsService } from '../../../../../core/services/organizations.service';
import { DictionaryStoreActions, DictionaryStoreSelectors } from '../../../../../store/dictionary';
import { UsersStoreActions, UsersStoreSelectors } from '../../../../../store/users';

interface RegisterRoleOption {
  label: string;
  value: string;
}

const employeeRoleCode = 'employee';
const clientManagerRoleCode = 'clientmanager';

@Component({
  selector: 'app-user-register-dialog',
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './user-register-dialog.component.html',
  styleUrl: './user-register-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserRegisterDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly organizationSearchChanges = new Subject<string>();
  private wasVisible = false;

  readonly visible = model.required<boolean>();
  readonly saved = output<void>();
  readonly organizations = signal<OrganizationListItemModel[]>([]);
  readonly organizationsLoading = signal(false);
  readonly failedLogoIds = signal<Set<string>>(new Set<string>());
  readonly isSaving = this.store.selectSignal(UsersStoreSelectors.isSubmitted);
  readonly roleDictionaries = this.store.selectSignal(DictionaryStoreSelectors.getRoleDictionaries);
  readonly rolesLoading = this.store.selectSignal(DictionaryStoreSelectors.getRoleDictionariesIsLoading);
  readonly selectedRoleId = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly selectedRole = computed(() => this.roleDictionaries().find((role) => role.id === this.selectedRoleId()) ?? null);
  readonly roleOptions = computed<RegisterRoleOption[]>(() => this.roleDictionaries()
    .filter((role) => this.roleCode(role) === employeeRoleCode || this.roleCode(role) === clientManagerRoleCode)
    .map((role) => ({
      label: this.roleCode(role) === clientManagerRoleCode ? 'Client' : role.name,
      value: role.id,
    })));
  readonly requiresOrganization = computed(() => this.roleCode(this.selectedRole()) === clientManagerRoleCode);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    surname: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    roleId: ['', [Validators.required]],
    organizationId: [null as string | null],
  });

  private readonly requiredMessages: Record<keyof UserRegisterDialogComponent['form']['controls'], string> = {
    name: 'Name is required.',
    surname: 'Surname is required.',
    email: 'Email is required.',
    roleId: 'Role is required.',
    organizationId: 'Organization is required.',
  };

  constructor() {
    if (this.roleDictionaries().length === 0) {
      this.store.dispatch(DictionaryStoreActions.loadRoleDictionaries());
    }

    this.organizationSearchChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((search) => {
          this.organizationsLoading.set(true);
          return this.organizationsService.getOrganizations({
            page: 1,
            pageSize: 10,
            search: search.trim() || undefined,
            sortBy: 'title',
            sortDirection: SortDirectionEnum.Asc,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.organizations.set(response.items);
          this.organizationsLoading.set(false);
        },
        error: () => {
          this.organizations.set([]);
          this.organizationsLoading.set(false);
        },
      });

    this.form.controls.roleId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roleId) => {
        this.selectedRoleId.set(roleId || null);

        const organizationControl = this.form.controls.organizationId;
        organizationControl.clearValidators();

        if (this.requiresOrganization()) {
          organizationControl.addValidators(Validators.required);
          this.searchOrganizations('');
        } else {
          organizationControl.setValue(null, { emitEvent: false });
          this.organizations.set([]);
        }

        organizationControl.updateValueAndValidity();
      });

    this.actions$
      .pipe(ofType(UsersStoreActions.registerUserSuccess), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetForm();
        this.saved.emit();
        this.close();
      });

    effect(() => {
      const isVisible = this.visible();
      if (isVisible && !this.wasVisible) {
        this.resetForm();
      }

      this.wasVisible = isVisible;
    });
  }

  searchOrganizations(search: string): void {
    this.organizationSearchChanges.next(search);
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.store.dispatch(UsersStoreActions.registerUser({
      command: {
        name: (value.name ?? '').trim(),
        surname: (value.surname ?? '').trim(),
        email: (value.email ?? '').trim(),
        roleId: value.roleId ?? '',
        organizationId: this.requiresOrganization() ? value.organizationId : null,
      },
    }));
  }

  cancel(): void {
    if (this.isSaving()) {
      return;
    }

    this.resetForm();
    this.close();
  }

  nameLength(): number {
    return this.form.controls.name.value?.length ?? 0;
  }

  surnameLength(): number {
    return this.form.controls.surname.value?.length ?? 0;
  }

  emailLength(): number {
    return this.form.controls.email.value?.length ?? 0;
  }

  logoUrl(organization: OrganizationListItemModel): string | null {
    if (!organization.logoPath || this.failedLogoIds().has(organization.id)) {
      return null;
    }

    return this.imageUrlService.normalize(organization.logoPath);
  }

  onLogoError(organization: OrganizationListItemModel): void {
    this.failedLogoIds.update((ids) => new Set(ids).add(organization.id));
  }

  organizationInitials(organization: OrganizationListItemModel): string {
    return organization.title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'O';
  }

  hasError(controlName: keyof typeof this.form.controls): boolean {
    return Boolean(this.errorMessage(controlName));
  }

  errorMessage(controlName: keyof typeof this.form.controls): string {
    const control = this.form.controls[controlName];
    if ((!this.submitted() && !control.dirty) || !control.errors) {
      return '';
    }

    return this.getErrorMessage(controlName, control);
  }

  private resetForm(): void {
    this.form.reset({ name: '', surname: '', email: '', roleId: '', organizationId: null });
    this.selectedRoleId.set(null);
    this.organizations.set([]);
    this.failedLogoIds.set(new Set<string>());
  }

  private close(): void {
    this.visible.set(false);
  }

  private roleCode(role: DictionaryModel<string> | null | undefined): string {
    return (role?.code || role?.name || '').replace(/\s+/g, '').toLowerCase();
  }

  private getErrorMessage(controlName: keyof UserRegisterDialogComponent['form']['controls'], control: AbstractControl): string {
    const errors = control.errors ?? {};

    if (errors['required']) {
      return this.requiredMessages[controlName];
    }

    if (errors['email']) {
      return 'Enter a valid email address.';
    }

    if (errors['maxlength']) {
      return `Maximum ${errors['maxlength'].requiredLength} characters.`;
    }

    return 'Invalid value.';
  }
}