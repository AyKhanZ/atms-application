import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ConfirmationService } from 'primeng/api';
import { BehaviorSubject, NEVER, of, throwError } from 'rxjs';
import { ProfileModel } from '../../core/models/profile/profile.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { DictionaryService } from '../../core/services/dictionary.service';
import { ProfileService } from '../../core/services/profile.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { UserStoreActions } from '../../store/user';
import { LanguageService } from '../../core/services/language.service';
import { SettingsComponent } from './settings.component';

const profile = (overrides: Partial<ProfileModel> = {}): ProfileModel => ({
  name: 'Leyla',
  surname: 'Mammadova',
  email: 'leyla@example.com',
  phoneNumber: '+994 50 123 45 67',
  position: 'Project manager',
  languageId: 2,
  birthDate: '1990-05-12',
  genderId: 2,
  maritalStatusId: 1,
  avatarPath: 'users/leyla.png',
  ...overrides,
});

// The first test renders the whole page with PrimeNG pickers; under the parallel full run that cold
// render alone can pass the 5 s default.
describe('SettingsComponent', { timeout: 15_000 }, () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let store: MockStore;
  let profiles: { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let snackBar: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };

  let queryParams: BehaviorSubject<ParamMap>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const element = () => fixture.nativeElement as HTMLElement;
  const confirmation = () => fixture.debugElement.injector.get(ConfirmationService);

  const create = () => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    profiles = {
      get: vi.fn(() => of(profile())),
      update: vi.fn(() => of(profile({ name: 'Aysel', avatarPath: 'users/new.png' }))),
    };
    snackBar = { success: vi.fn(), error: vi.fn(), warn: vi.fn() };
    queryParams = new BehaviorSubject(convertToParamMap({}));
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideMockStore(),
        { provide: ProfileService, useValue: profiles },
        {
          provide: DictionaryService,
          useValue: {
            getLanguageDictionaries: () =>
              of([
                { id: 1, code: 'AZ', name: 'Azerbaijani', nativeName: 'Azərbaycanca' },
                { id: 2, code: 'EN', name: 'English', nativeName: 'English' },
              ]),
            getGenderDictionaries: () => of([{ id: 2, name: 'Female', code: 'F' }]),
            getMaritalStatusDictionaries: () => of([{ id: 1, name: 'Single', code: 'S' }]),
          },
        },
        { provide: SnackBarService, useValue: snackBar },
        {
          provide: LanguageService,
          useValue: { current: () => 'en', rememberAndReload: vi.fn() },
        },
        { provide: AuthService, useValue: { changePassword: vi.fn(), forgotPassword: vi.fn() } },
        { provide: AuthSessionService, useValue: { replaceTokenPair: vi.fn(), logout: vi.fn() } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } },
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
  });

  it('fills the form from the profile and leaves it pristine', () => {
    create();

    const value = component.personalForm.getRawValue();
    expect(value.name).toBe('Leyla');
    expect(value.email).toBe('leyla@example.com');
    expect(value.birthDate).toEqual(new Date(1990, 4, 12));
    expect(component.personalForm.dirty).toBe(false);
  });

  // An account created before onboarding can miss fields; Settings is where they get filled in.
  it('shows missing profile fields as empty and required', () => {
    profiles.get.mockReturnValue(
      of(
        profile({
          phoneNumber: null,
          position: null,
          birthDate: null,
          genderId: null,
          maritalStatusId: null,
        }),
      ),
    );
    create();

    const controls = component.personalForm.controls;
    expect(controls.phoneNumber.value).toBe('');
    expect(controls.birthDate.value).toBeNull();
    expect(controls.genderId.hasError('required')).toBe(true);
    expect(component.personalForm.invalid).toBe(true);
  });

  it('shows an error with Retry when the profile cannot be loaded', () => {
    profiles.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    create();

    expect(element().textContent).toContain('Could not load your settings.');

    profiles.get.mockReturnValue(of(profile()));
    component.load();
    fixture.detectChanges();

    expect(element().textContent).not.toContain('Could not load your settings.');
  });

  it('keeps Save and Discard disabled until something changes', () => {
    create();

    const buttons = Array.from(
      element().querySelectorAll<HTMLButtonElement>(
        'form[aria-label="Profile"] .settings-pane__actions button',
      ),
    );
    expect(buttons.map((button) => button.disabled)).toEqual([true, true]);

    component.save();
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('saves the profile and updates me in the store so the top bar refreshes', () => {
    create();
    component.personalForm.controls.name.setValue('Aysel');
    component.personalForm.controls.position.setValue('Lead');

    component.save();

    expect(profiles.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aysel',
        birthDate: '1990-05-12',
        languageId: 2,
        avatar: null,
      }),
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      UserStoreActions.updateMeFromProfile({
        name: 'Aysel',
        surname: 'Mammadova',
        avatarPath: 'users/new.png',
        language: 'EN',
      }),
    );
    expect(component.personalForm.dirty).toBe(false);
    expect(snackBar.success).toHaveBeenCalledWith('Profile saved.');
  });

  it('shows a PhoneNumber refusal under the field, not as a toast', () => {
    profiles.update.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: [{ field: 'PhoneNumber', error: 'Enter a valid phone number.' }] },
          }),
      ),
    );
    create();
    component.personalForm.controls.position.setValue('Lead');

    component.save();

    expect(component.personalForm.controls.phoneNumber.getError('server')).toBe(
      'Enter a valid phone number.',
    );
    expect(snackBar.error).not.toHaveBeenCalled();
  });

  it('asks for a photo when the profile has none and none was chosen', () => {
    profiles.get.mockReturnValue(of(profile({ avatarPath: 'default-avatar.png' })));
    create();
    component.personalForm.controls.position.setValue('Lead');

    component.save();

    expect(component.avatarError()).toBe('Choose a profile photo.');
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('puts the loaded values back on Discard', () => {
    create();
    component.personalForm.controls.name.setValue('Changed');
    component.personalForm.markAsDirty();

    component.discard();

    expect(component.personalForm.controls.name.value).toBe('Leyla');
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('opens Profile by default and Security from ?tab=security', () => {
    create();
    const hidden = (selector: string) =>
      element().querySelector(selector)?.classList.contains('settings-pane--hidden');

    expect(component.activeTab()).toBe('profile');
    expect(hidden('form[aria-label="Profile"]')).toBe(false);
    expect(hidden('app-settings-password')).toBe(true);

    queryParams.next(convertToParamMap({ tab: 'security' }));
    fixture.detectChanges();

    expect(hidden('form[aria-label="Profile"]')).toBe(true);
    expect(hidden('app-settings-password')).toBe(false);
  });

  // Both tabs stay rendered, so switching keeps what was typed and needs no confirmation.
  it('keeps profile edits when switching to the Security tab', () => {
    create();
    const confirm = vi.spyOn(confirmation(), 'confirm');
    component.personalForm.controls.name.setValue('Aysel');

    component.selectTab('security');
    queryParams.next(convertToParamMap({ tab: 'security' }));
    fixture.detectChanges();

    expect(confirm).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { tab: 'security' } }),
    );
    expect(component.personalForm.controls.name.value).toBe('Aysel');
  });

  // The skeleton is the page itself, so its height is the page height.
  it('draws the real page with a loading marker while the profile loads', () => {
    profiles.get.mockReturnValue(NEVER);
    create();

    const card = element().querySelector('.settings-card');
    expect(card?.classList.contains('settings-card--loading')).toBe(true);
    expect(card?.hasAttribute('inert')).toBe(true);
    expect(element().querySelector('app-personal-info-fields')).not.toBeNull();
  });

  // A field edited and put back is not a change: no Save, no "leave without saving?".
  it('treats a value typed and then restored as unchanged', () => {
    create();
    const name = component.personalForm.controls.name;

    name.setValue('Leylaa');
    name.markAsDirty();
    expect(component.personalChanged()).toBe(true);
    expect(component.hasUnsavedChanges()).toBe(true);

    name.setValue('Leyla');
    expect(component.personalChanged()).toBe(false);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('counts a newly chosen photo as a change', () => {
    create();

    component.onAvatarChange({ file: new File(['x'], 'me.png'), errors: null });

    expect(component.personalChanged()).toBe(true);
  });

  it('shows a rejected photo as an error without counting it as a change', () => {
    create();

    component.onAvatarChange({ file: null, errors: { fileSize: true } });

    expect(component.avatarError()).toBe('Image size must be 5 MB or less.');
    expect(component.personalChanged()).toBe(false);
  });

  it('asks before leaving with unsaved changes', async () => {
    create();
    vi.spyOn(confirmation(), 'confirm').mockImplementation((value) => {
      value.reject?.();
      return confirmation();
    });

    expect(await component.confirmUnsavedChanges()).toBe(false);
  });
});
