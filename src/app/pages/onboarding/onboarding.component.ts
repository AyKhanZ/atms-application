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
import { InputTextModule } from 'primeng/inputtext';
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
import { PersonalInfoFieldsComponent } from '../../shared/components/personal-info-fields/personal-info-fields.component';
import {
  createPersonalInfoForm,
  personalInfoSnapshot,
} from '../../shared/components/personal-info-fields/personal-info.form';
import { NewPasswordFieldsComponent } from '../../shared/components/new-password-fields/new-password-fields.component';
import { createNewPasswordForm } from '../../shared/components/new-password-fields/new-password.form';
import { fromIsoDate, toIsoDate } from '../../core/utils/dashboard-query.utils';
import { avatarErrorMessage } from '../../core/utils/profile-avatar.utils';
import { validationMessage } from '../../core/utils/http-error.utils';
import { showPhoneServerError } from '../../core/utils/phone-number.utils';

type InvitationGroup = FormGroup<{
  name: FormControl<string>;
  surname: FormControl<string>;
  email: FormControl<string>;
}>;

const LAST_ONBOARDING_VIEW_KEY = 'lastOnboardingView';
const DEFAULT_INVITATION_ROWS = 3;

@Component({
  selector: 'app-onboarding',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    TooltipModule,
    FileUploadComponent,
    PersonalInfoFieldsComponent,
    NewPasswordFieldsComponent,
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

  readonly personalForm = createPersonalInfoForm();
  readonly securityForm = createNewPasswordForm();
  private savedPersonalSnapshot = personalInfoSnapshot(this.personalForm.getRawValue());

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
    this.avatarError.set(value.errors ? avatarErrorMessage(value.errors) : '');
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
    data.append('birthDate', toIsoDate(value.birthDate));
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
        error: (error: HttpErrorResponse) => this.reportPersonalInfoError(error),
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
      .pipe(
        finalize(() => {
          this.savingInvitations = false;
          this.actionLoading.set(false);
        }),
      )
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
      .pipe(
        finalize(() => {
          this.savingInvitations = false;
          this.actionLoading.set(false);
        }),
      )
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
      (this.personalInfoChanged() || this.passwordTyped() || this.invitationRows.dirty)
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  // by value not dirty, edited and put back is not a change
  private personalInfoChanged(): boolean {
    return personalInfoSnapshot(this.personalForm.getRawValue()) !== this.savedPersonalSnapshot;
  }

  private passwordTyped(): boolean {
    const { password, confirmPassword } = this.securityForm.getRawValue();
    return Boolean(password || confirmPassword);
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
      birthDate: fromIsoDate(personal.birthDate),
      genderId: personal.genderId,
      maritalStatusId: personal.maritalStatusId,
      avatar: null,
    });
    this.personalForm.markAsPristine();
    this.savedPersonalSnapshot = personalInfoSnapshot(this.personalForm.getRawValue());
    this.avatarError.set('');
    this.avatarResetKey.update((key) => key + 1);

    this.invitationRows.clear();
    const users: InvitedUserCommand[] = model.invitedUsers.length
      ? model.invitedUsers
      : Array.from({ length: DEFAULT_INVITATION_ROWS }, () => ({
          name: '',
          surname: '',
          email: '',
        }));
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

  private reportPersonalInfoError(error: HttpErrorResponse): void {
    const phone = this.personalForm.controls.phoneNumber;
    if (showPhoneServerError(phone, error, (message) => this.snackBar.error(message))) return;

    this.handleError(error, 'Could not save personal information.');
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    if (error.status === 409) {
      this.snackBar.warn(
        error.error?.error ?? 'This page was updated elsewhere. Reload it and try again.',
      );
      return;
    }
    this.snackBar.error(validationMessage(error) ?? error.error?.error ?? fallback);
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
}
