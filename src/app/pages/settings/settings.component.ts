import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { finalize, forkJoin, map } from 'rxjs';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { DictionaryModel } from '../../core/models/dictionary.model';
import { LanguageModel } from '../../core/models/language.model';
import { ProfileModel } from '../../core/models/profile/profile.model';
import { DictionaryService } from '../../core/services/dictionary.service';
import { ImageUrlService } from '../../core/services/image-url.service';
import { ProfileService } from '../../core/services/profile.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { fromIsoDate, toIsoDate } from '../../core/utils/dashboard-query.utils';
import { serverErrorMessage, validationMessage } from '../../core/utils/http-error.utils';
import { avatarErrorMessage } from '../../core/utils/profile-avatar.utils';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../shared/components/entity-tabs/entity-tabs.component';
import { FileUploadValue } from '../../shared/components/file-upload/file-upload.component';
import { PersonalInfoFieldsComponent } from '../../shared/components/personal-info-fields/personal-info-fields.component';
import {
  createPersonalInfoForm,
  personalInfoSnapshot,
} from '../../shared/components/personal-info-fields/personal-info.form';
import { PersonInitialsPipe, PersonNamePipe } from '../../shared/pipes/person-name.pipe';
import { ImageFileValidator } from '../../shared/validators/image-file.validator';
import { UserStoreActions } from '../../store/user';
import { SettingsPasswordComponent } from './settings-password/settings-password.component';
import { SettingsPhotoComponent } from './settings-photo/settings-photo.component';

type SettingsTab = 'profile' | 'security';

const UNSAVED_CHANGES_DIALOG = 'settingsUnsavedChanges';

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    SkeletonModule,
    ConfirmDialogComponent,
    EntityTabsComponent,
    PersonalInfoFieldsComponent,
    PersonNamePipe,
    PersonInitialsPipe,
    SettingsPasswordComponent,
    SettingsPhotoComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);
  private readonly profiles = inject(ProfileService);
  private readonly dictionaries = inject(DictionaryService);
  private readonly imageUrls = inject(ImageUrlService);
  private readonly snackBar = inject(SnackBarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly passwordPanel = viewChild(SettingsPasswordComponent);

  readonly unsavedChangesDialog = UNSAVED_CHANGES_DIALOG;
  readonly tabs: EntityTab<SettingsTab>[] = [
    { id: 'profile', label: 'Profile', icon: 'pi-user' },
    { id: 'security', label: 'Security', icon: 'pi-lock' },
  ];
  /**
   * Both tabs stay rendered and keep what was typed, so switching needs no confirmation; only
   * leaving the page does. The open tab lives in the URL (?tab=security) like on project details.
   */
  readonly activeTab = toSignal(
    this.route.queryParamMap.pipe(
      map((params): SettingsTab => (params.get('tab') === 'security' ? 'security' : 'profile')),
    ),
    { initialValue: 'profile' },
  );
  readonly photoHint = inject(ImageFileValidator).hint;
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly saving = signal(false);
  readonly profile = signal<ProfileModel | null>(null);
  readonly languages = signal<LanguageModel[]>([]);
  readonly genders = signal<DictionaryModel[]>([]);
  readonly maritalStatuses = signal<DictionaryModel[]>([]);
  readonly avatarError = signal('');
  readonly avatarResetKey = signal(0);
  readonly avatarUrl = computed(() => this.imageUrls.normalizeAvatar(this.profile()?.avatarPath));

  readonly personalForm = createPersonalInfoForm();
  private readonly savedSnapshot = signal('');
  private readonly currentSnapshot = toSignal(
    this.personalForm.valueChanges.pipe(
      map(() => personalInfoSnapshot(this.personalForm.getRawValue())),
    ),
    { initialValue: '' },
  );
  /** Compared by value: a field edited and put back is not a change. */
  readonly personalChanged = computed(() => this.currentSnapshot() !== this.savedSnapshot());

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    forkJoin({
      profile: this.profiles.get(),
      languages: this.dictionaries.getLanguageDictionaries(),
      genders: this.dictionaries.getGenderDictionaries(),
      maritalStatuses: this.dictionaries.getMaritalStatusDictionaries(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ profile, languages, genders, maritalStatuses }) => {
          this.languages.set(languages);
          this.genders.set(genders);
          this.maritalStatuses.set(maritalStatuses);
          this.applyProfile(profile);
        },
        error: () => this.loadFailed.set(true),
      });
  }

  selectTab(tab: SettingsTab): void {
    if (tab === this.activeTab()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'security' ? 'security' : null },
      queryParamsHandling: 'merge',
    });
  }

  onAvatarChange(value: FileUploadValue): void {
    this.avatarError.set(value.errors ? avatarErrorMessage(value.errors) : '');
    if (!value.errors) this.personalForm.controls.avatar.setValue(value.file);
  }

  save(): void {
    if (this.saving() || !this.personalChanged()) return;
    const hasAvatar = Boolean(this.personalForm.controls.avatar.value || this.avatarUrl());
    if (!hasAvatar) this.avatarError.set('Choose a profile photo.');
    this.personalForm.markAllAsTouched();
    if (this.personalForm.invalid || !hasAvatar) return;

    const value = this.personalForm.getRawValue();
    if (
      !value.birthDate ||
      value.languageId === null ||
      value.genderId === null ||
      value.maritalStatusId === null
    ) {
      return;
    }

    this.saving.set(true);
    this.profiles
      .update({
        name: value.name.trim(),
        surname: value.surname.trim(),
        phoneNumber: value.phoneNumber.trim(),
        position: value.position.trim(),
        languageId: value.languageId,
        birthDate: toIsoDate(value.birthDate),
        genderId: value.genderId,
        maritalStatusId: value.maritalStatusId,
        avatar: value.avatar,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (profile) => {
          this.applyProfile(profile);
          this.store.dispatch(
            UserStoreActions.updateMeFromProfile({
              name: profile.name,
              surname: profile.surname,
              avatarPath: profile.avatarPath,
              language: this.languageCode(profile.languageId),
            }),
          );
          this.snackBar.success('Profile saved.');
        },
        error: (error: HttpErrorResponse) =>
          this.snackBar.error(
            validationMessage(error) ?? serverErrorMessage(error, 'Could not save the profile.'),
          ),
      });
  }

  discard(): void {
    const profile = this.profile();
    if (profile) this.applyProfile(profile);
  }

  hasUnsavedChanges(): boolean {
    return this.personalChanged() || (this.passwordPanel()?.hasUnsavedChanges() ?? false);
  }

  confirmUnsavedChanges(): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmation.confirm({
        key: UNSAVED_CHANGES_DIALOG,
        header: 'Discard changes?',
        message: 'You have unsaved changes. Leave without saving?',
        acceptLabel: 'Discard',
        rejectLabel: 'Stay',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private applyProfile(profile: ProfileModel): void {
    this.profile.set(profile);
    this.personalForm.reset({
      name: profile.name,
      surname: profile.surname,
      email: profile.email,
      phoneNumber: profile.phoneNumber ?? '',
      position: profile.position ?? '',
      languageId: profile.languageId,
      birthDate: fromIsoDate(profile.birthDate),
      genderId: profile.genderId,
      maritalStatusId: profile.maritalStatusId,
      avatar: null,
    });
    this.savedSnapshot.set(personalInfoSnapshot(this.personalForm.getRawValue()));
    this.avatarError.set('');
    this.avatarResetKey.update((key) => key + 1);
  }

  private languageCode(languageId: number): string {
    return this.languages().find((language) => language.id === languageId)?.code ?? '';
  }
}
