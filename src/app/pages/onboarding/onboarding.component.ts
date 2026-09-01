import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DictionaryModel } from '../../core/models/dictionary.model';
import { LanguageModel } from '../../core/models/language.model';
import { InvitedUserCommand } from '../../core/models/onboarding/onboarding.commands';
import { OnboardingModel } from '../../core/models/onboarding/onboarding.models';
import { OnboardingStepCode, OnboardingView } from '../../core/models/onboarding/onboarding.types';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { DictionaryService } from '../../core/services/dictionary.service';
import { ImageUrlService } from '../../core/services/image-url.service';
import { OnboardingService } from '../../core/services/onboarding.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import {
  FileUploadComponent,
  FileUploadValue,
} from '../../shared/components/file-upload/file-upload.component';
import { PasswordRules } from '../../shared/components/password-rules/password-rules';
import { PasswordValidators } from '../../shared/validators/password.validators';

type InvitationGroup = FormGroup<{
  name: FormControl<string>;
  surname: FormControl<string>;
  email: FormControl<string>;
}>;

interface SelectOption {
  id: number;
  label: string;
}

const LAST_ONBOARDING_VIEW_KEY = 'lastOnboardingView';
const DEFAULT_INVITATION_ROWS = 3;

@Component({
  selector: 'app-onboarding',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    SkeletonModule,
    TooltipModule,
    FileUploadComponent,
    PasswordRules,
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent implements HasUnsavedChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly onboardingApi = inject(OnboardingService);
  private readonly dictionariesApi = inject(DictionaryService);
  private readonly authSession = inject(AuthSessionService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly snackBar = inject(SnackBarService);
  private readonly router = inject(Router);

  readonly initialLoading = signal(true);
  readonly actionLoading = signal(false);
  readonly loadFailed = signal(false);
  readonly completed = signal(false);
  readonly model = signal<OnboardingModel | null>(null);
  readonly activeView = signal<OnboardingView>(this.getStoredView());
  readonly passwordRulesPulse = signal(false);
  readonly languages = signal<LanguageModel[]>([]);
  readonly genders = signal<DictionaryModel[]>([]);
  readonly maritalStatuses = signal<DictionaryModel[]>([]);
  readonly avatarError = signal('');
  readonly avatarResetKey = signal(0);
  readonly invitationsQueued = signal(0);

  readonly languageOptions = computed<SelectOption[]>(() =>
    this.languages().map((language) => ({
      id: language.id,
      label: `${language.nativeName} (${language.code})`,
    })),
  );
  readonly isClientManager = computed(() => this.model()?.role === 'clientManager');
  readonly maxInvitations = computed(() => this.model()?.maxInvitations ?? 6);
  readonly existingAvatarUrl = computed(() =>
    this.model()?.personalInfo.avatarUploaded
      ? this.imageUrlService.normalizeAvatar(this.model()?.personalInfo.avatarPath)
      : null,
  );
  readonly existingAvatarName = computed(() =>
    this.model()?.personalInfo.avatarUploaded
      ? (this.model()?.personalInfo.avatarPath?.split('/').at(-1) ?? '')
      : '',
  );

  readonly minBirthDate = startOfDay(yearsAgo(100));
  readonly maxBirthDate = startOfDay(yearsAgo(18));

  readonly personalForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(50)]),
    surname: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    email: this.fb.control(''),
    phoneNumber: this.fb.control('', [
      Validators.required,
      Validators.maxLength(20),
      Validators.pattern(/^\+[0-9 ()-]{7,19}$/),
    ]),
    position: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    languageId: new FormControl<number | null>(null, Validators.required),
    birthDate: new FormControl<Date | null>(null, Validators.required),
    genderId: new FormControl<number | null>(null, Validators.required),
    maritalStatusId: new FormControl<number | null>(null, Validators.required),
    avatar: new FormControl<File | null>(null),
  });

  readonly securityForm = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(40),
          PasswordValidators.strongPassword(),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: PasswordValidators.passwordsMatch('password', 'confirmPassword') },
  );

  readonly invitationRows = new FormArray<InvitationGroup>([]);
  private passwordRulesPulseTimeout?: ReturnType<typeof setTimeout>;
  private savingInvitations = false;

  constructor() {
    this.load();
  }

  get passwordValue(): string {
    return this.securityForm.controls.password.value;
  }
  get confirmPasswordValue(): string {
    return this.securityForm.controls.confirmPassword.value;
  }
  get canAddInvitation(): boolean {
    return this.invitationRows.length < this.maxInvitations();
  }

  load(): void {
    this.initialLoading.set(true);
    this.loadFailed.set(false);
    forkJoin({
      onboarding: this.onboardingApi.get(),
      languages: this.dictionariesApi.getLanguageDictionaries(),
      genders: this.dictionariesApi.getGenderDictionaries(),
      maritalStatuses: this.dictionariesApi.getMaritalStatusDictionaries(),
    })
      .pipe(finalize(() => this.initialLoading.set(false)))
      .subscribe({
        next: ({ onboarding, languages, genders, maritalStatuses }) => {
          this.languages.set(languages);
          this.genders.set(genders);
          this.maritalStatuses.set(maritalStatuses);
          this.applyModel(onboarding);
        },
        error: () => this.loadFailed.set(true),
      });
  }

  onAvatarChange(value: FileUploadValue): void {
    this.personalForm.controls.avatar.setValue(value.file);
    this.personalForm.controls.avatar.markAsDirty();
    this.avatarError.set(value.errors ? this.avatarErrorMessage(value.errors) : '');
  }

  onBirthDateInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const formattedValue = formatBirthDateInput(input.value);
    if (input.value !== formattedValue) {
      input.value = formattedValue;
    }

    const date = parseDisplayBirthDate(formattedValue);
    if (date) {
      this.personalForm.controls.birthDate.setValue(date);
      this.personalForm.controls.birthDate.markAsDirty();
    }
  }

  onBirthDateBlur(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input?.value) return;

    const date = parseDisplayBirthDate(input.value);
    if (!date) {
      this.personalForm.controls.birthDate.setValue(null);
    }
  }

  savePersonalInfo(): void {
    if (this.actionLoading()) return;
    const hasAvatar = Boolean(
      this.personalForm.controls.avatar.value || this.model()?.personalInfo.avatarUploaded,
    );
    if (!hasAvatar) this.avatarError.set('Choose a profile photo.');
    this.personalForm.markAllAsTouched();
    if (this.personalForm.invalid || !hasAvatar || this.avatarError()) return;

    const value = this.personalForm.getRawValue();
    const model = this.model();
    if (
      !model ||
      !value.birthDate ||
      value.languageId === null ||
      value.genderId === null ||
      value.maritalStatusId === null
    )
      return;

    const data = new FormData();
    data.append('name', value.name.trim());
    data.append('surname', value.surname.trim());
    data.append('phoneNumber', value.phoneNumber.trim());
    data.append('position', value.position.trim());
    data.append('languageId', value.languageId.toString());
    data.append('birthDate', toDateOnly(value.birthDate));
    data.append('genderId', value.genderId.toString());
    data.append('maritalStatusId', value.maritalStatusId.toString());
    data.append('version', model.version.toString());
    if (value.avatar) data.append('avatar', value.avatar, value.avatar.name);

    this.actionLoading.set(true);
    this.onboardingApi
      .savePersonalInfo(data)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.applyModel(response);
          this.snackBar.success('Personal information saved.');
        },
        error: (error: HttpErrorResponse) =>
          this.handleError(error, 'Could not save personal information.'),
      });
  }

  saveSecurity(): void {
    if (this.actionLoading()) return;
    this.securityForm.markAllAsTouched();
    const model = this.model();
    if (this.securityForm.invalid || !model) {
      if (this.securityForm.invalid) this.pulsePasswordRules();
      return;
    }
    this.actionLoading.set(true);
    this.onboardingApi
      .saveSecurity({ ...this.securityForm.getRawValue(), version: model.version })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.applyModel(response);
          this.securityForm.reset();
          this.securityForm.markAsPristine();
          this.snackBar.success('New password saved.');
        },
        error: (error: HttpErrorResponse) =>
          this.handleError(error, 'Could not save the password.'),
      });
  }

  addInvitation(): void {
    if (!this.canAddInvitation) return;
    this.invitationRows.push(this.createInvitationGroup());
    this.invitationRows.markAsDirty();
  }

  removeInvitation(index: number): void {
    this.invitationRows.removeAt(index);
    if (this.invitationRows.length === 0) this.invitationRows.push(this.createInvitationGroup());
    this.invitationRows.markAsDirty();
  }

  saveInvitations(): void {
    if (this.actionLoading()) return;
    this.invitationRows.markAllAsTouched();
    const model = this.model();
    if (this.invitationRows.invalid || !model) return;
    const users = this.invitationRows.getRawValue().map((user) => ({
      name: user.name.trim(),
      surname: user.surname.trim(),
      email: user.email.trim(),
    }));
    this.savingInvitations = true;
    this.actionLoading.set(true);
    this.onboardingApi
      .saveInvitations(users, model.version)
      .pipe(finalize(() => {
        this.savingInvitations = false;
        this.actionLoading.set(false);
      }))
      .subscribe({
        next: (response) => {
          this.invitationRows.markAsPristine();
          this.applyModel(response);
          this.snackBar.success('Invitations are ready to send.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error, 'Could not save invitations.'),
      });
  }

  skipInvitations(): void {
    const model = this.model();
    if (this.actionLoading() || !model) return;
    this.savingInvitations = true;
    this.actionLoading.set(true);
    this.onboardingApi
      .skipInvitations(model.version)
      .pipe(finalize(() => {
        this.savingInvitations = false;
        this.actionLoading.set(false);
      }))
      .subscribe({
        next: (response) => {
          this.invitationRows.markAsPristine();
          this.applyModel(response);
          this.snackBar.info('You can invite colleagues later from Users.');
        },
        error: (error: HttpErrorResponse) => this.handleError(error, 'Could not skip invitations.'),
      });
  }

  completeOnboarding(): void {
    const model = this.model();
    if (this.actionLoading() || !model) return;
    this.actionLoading.set(true);
    this.onboardingApi
      .complete(model.version)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.authSession.updateAccessToken(response.accessToken, response.accessTokenExpireTime);
          this.invitationsQueued.set(response.invitationsQueued);
          this.personalForm.markAsPristine();
          this.securityForm.markAsPristine();
          this.invitationRows.markAsPristine();
          this.completed.set(true);
        },
        error: (error: HttpErrorResponse) => this.handleError(error, 'Could not complete setup.'),
      });
  }

  goBack(): void {
    const view = this.activeView();
    if (view === 'security') this.setActiveView('personalInfo');
    if (view === 'invitations') this.setActiveView('security');
    if (view === 'review') this.setActiveView(this.isClientManager() ? 'invitations' : 'security');
  }

  openStep(code: OnboardingStepCode): void {
    if (code === 'personalInfo' || this.stepIsAvailable(code)) this.setActiveView(code);
  }

  stepIsAvailable(code: OnboardingStepCode): boolean {
    const steps = this.model()?.steps ?? [];
    if (code === 'security')
      return steps.some((x) => x.code === 'personalInfo' && x.status === 'completed');
    if (code === 'invitations')
      return steps.some((x) => x.code === 'security' && x.status === 'completed');
    return true;
  }

  stepStatus(code: OnboardingStepCode): string {
    return this.model()?.steps.find((step) => step.code === code)?.status ?? 'notStarted';
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }
  logout(): void {
    this.authSession.logout();
  }

  hasUnsavedChanges(): boolean {
    return (
      !this.completed() &&
      !this.savingInvitations &&
      (this.personalForm.dirty || this.securityForm.dirty || this.invitationRows.dirty)
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private applyModel(model: OnboardingModel): void {
    this.model.set(model);
    const personal = model.personalInfo;
    this.personalForm.patchValue({
      name: personal.name,
      surname: personal.surname,
      email: personal.email,
      phoneNumber: personal.phoneNumber ?? '',
      position: personal.position ?? '',
      languageId: personal.languageId,
      birthDate: personal.birthDate ? parseDateOnly(personal.birthDate) : null,
      genderId: personal.genderId,
      maritalStatusId: personal.maritalStatusId,
      avatar: null,
    });
    this.personalForm.markAsPristine();
    this.avatarError.set('');
    this.avatarResetKey.update((key) => key + 1);

    this.invitationRows.clear();
    const users: InvitedUserCommand[] = model.invitedUsers.length
      ? model.invitedUsers
      : Array.from({ length: DEFAULT_INVITATION_ROWS }, () => ({ name: '', surname: '', email: '' }));
    users.forEach((user) => this.invitationRows.push(this.createInvitationGroup(user)));
    this.invitationRows.markAsPristine();
    this.setActiveView(model.currentStep === 'complete' ? 'review' : model.currentStep);
  }

  private createInvitationGroup(user?: Partial<InvitedUserCommand>): InvitationGroup {
    return this.fb.group({
      name: this.fb.control(user?.name ?? '', [Validators.required, Validators.maxLength(50)]),
      surname: this.fb.control(user?.surname ?? '', [
        Validators.required,
        Validators.maxLength(100),
      ]),
      email: this.fb.control(user?.email ?? '', [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
      ]),
    });
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    if (error.status === 409) {
      this.snackBar.warn(
        error.error?.error ?? 'This page was updated elsewhere. Reload it and try again.',
      );
      return;
    }
    const fieldErrors = error.error?.errors as { error?: string }[] | undefined;
    this.snackBar.error(fieldErrors?.[0]?.error ?? error.error?.error ?? fallback);
  }

  private setActiveView(view: OnboardingView): void {
    this.activeView.set(view);
    try {
      sessionStorage.setItem(LAST_ONBOARDING_VIEW_KEY, view);
    } catch {
      return;
    }
  }

  private getStoredView(): OnboardingView {
    try {
      const view = sessionStorage.getItem(LAST_ONBOARDING_VIEW_KEY);
      if (view === 'security' || view === 'invitations' || view === 'review') return view;
    } catch {
      return 'personalInfo';
    }

    return 'personalInfo';
  }

  private pulsePasswordRules(): void {
    if (!this.passwordValue && !this.confirmPasswordValue) return;
    clearTimeout(this.passwordRulesPulseTimeout);
    this.passwordRulesPulse.set(false);
    this.passwordRulesPulseTimeout = setTimeout(() => {
      this.passwordRulesPulse.set(true);
      this.passwordRulesPulseTimeout = setTimeout(() => this.passwordRulesPulse.set(false), 650);
    });
  }

  private avatarErrorMessage(errors: Record<string, unknown>): string {
    if (errors['fileType']) return 'Use JPG, JPEG, JFIF, PNG or WEBP image.';
    if (errors['fileSize']) return 'Image size must be 5 MB or less.';
    if (errors['fileNameLength']) return 'File name is too long.';
    if (errors['imageDimensions']) return 'Image dimensions are too large or invalid.';
    return 'Choose a valid profile photo.';
  }
}

function yearsAgo(years: number): Date {
  const now = new Date();
  return new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatBirthDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function parseDisplayBirthDate(value: string): Date | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}
