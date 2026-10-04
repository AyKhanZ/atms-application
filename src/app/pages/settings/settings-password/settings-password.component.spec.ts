import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { of, Subject, throwError } from 'rxjs';
import { AccessModel } from '../../../core/models/auth/auth.models';
import { AuthService } from '../../../core/services/auth.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { SettingsPasswordComponent } from './settings-password.component';

const tokens: AccessModel = {
  accessToken: 'new-access',
  refreshToken: 'new-refresh',
  accessTokenExpireTime: '2026-10-04T12:00:00Z',
};

/** An access token whose only claim that matters here is whose it is. */
const tokenOf = (sub: string) => `header.${btoa(JSON.stringify({ sub }))}.signature`;

describe('SettingsPasswordComponent', () => {
  let fixture: ComponentFixture<SettingsPasswordComponent>;
  let component: SettingsPasswordComponent;
  let auth: {
    changePassword: ReturnType<typeof vi.fn>;
    forgotPassword: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let session: {
    replaceTokenPair: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    accessModel: ReturnType<typeof vi.fn>;
  };
  let snackBar: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let confirmation: ConfirmationService;

  const fill = (current: string, password: string, confirm = password) => {
    component.currentPassword.setValue(current);
    component.currentPassword.markAsDirty();
    component.passwordForm.setValue({ password, confirmPassword: confirm });
    component.passwordForm.markAsDirty();
  };

  beforeEach(async () => {
    auth = {
      changePassword: vi.fn(() => of(tokens)),
      forgotPassword: vi.fn(() => of(undefined)),
      logout: vi.fn(() => of(undefined)),
    };
    session = {
      replaceTokenPair: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: vi.fn(() => true),
      accessModel: vi.fn(() => ({ accessToken: tokenOf('user-a') })),
    };
    snackBar = { success: vi.fn(), error: vi.fn(), warn: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [SettingsPasswordComponent],
      providers: [
        ConfirmationService,
        { provide: AuthService, useValue: auth },
        { provide: AuthSessionService, useValue: session },
        { provide: SnackBarService, useValue: snackBar },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    confirmation = TestBed.inject(ConfirmationService);
    fixture = TestBed.createComponent(SettingsPasswordComponent);
    fixture.componentRef.setInput('email', 'leyla@example.com');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('stores the new token pair and clears the form after a password change', () => {
    fill('OldPassword1!', 'NewPassword1!');

    component.save();

    expect(auth.changePassword).toHaveBeenCalledWith({
      oldPassword: 'OldPassword1!',
      newPassword: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });
    expect(session.replaceTokenPair).toHaveBeenCalledWith(tokens);
    expect(component.currentPassword.value).toBe('');
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(snackBar.success).toHaveBeenCalledWith('Password changed.');
  });

  it('does not call the server while the form is invalid', () => {
    fill('', 'short');

    component.save();

    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  it('refuses a new password equal to the current one without calling the server', () => {
    fill('SamePassword1!', 'SamePassword1!');

    component.save();

    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(component.newPasswordError()).toBe(
      'Choose a password different from your current password.',
    );
  });

  it('shows a wrong current password under its field and keeps what was typed', () => {
    auth.changePassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: [{ field: 'OldPassword', error: 'Current password is incorrect.' }] },
          }),
      ),
    );
    fill('WrongPassword1!', 'NewPassword1!');

    component.save();

    expect(component.currentPasswordError()).toBe('Current password is incorrect.');
    expect(component.passwordForm.controls.password.value).toBe('NewPassword1!');
    expect(snackBar.error).not.toHaveBeenCalled();
  });

  it('clears the wrong-password error once the user edits the current password', () => {
    component.currentPasswordError.set('Current password is incorrect.');

    component.currentPassword.setValue('Another1!');

    expect(component.currentPasswordError()).toBe('');
  });

  it('shows the lockout message from the server in a snackbar', () => {
    auth.changePassword.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 423,
            error: { error: 'Account is locked. Try again in 15 minutes.' },
          }),
      ),
    );
    fill('WrongPassword1!', 'NewPassword1!');

    component.save();

    expect(snackBar.warn).toHaveBeenCalledWith('Account is locked. Try again in 15 minutes.');
    expect(session.replaceTokenPair).not.toHaveBeenCalled();
  });

  it('asks before sending a reset link, then signs out and opens login with the address in state', () => {
    let request: Confirmation | undefined;
    vi.spyOn(confirmation, 'confirm').mockImplementation((value) => {
      request = value;
      return confirmation;
    });
    fill('Typed1!', '');

    component.confirmForgotPassword();
    expect(auth.forgotPassword).not.toHaveBeenCalled();
    expect(request?.message).toContain('leyla@example.com');

    request?.accept?.();

    expect(auth.forgotPassword).toHaveBeenCalledWith({ email: 'leyla@example.com' });
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(session.logout).toHaveBeenCalledWith(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      state: { resetSentTo: 'leyla@example.com' },
    });
  });

  it('does nothing on "forgot password" until the address is known', () => {
    const confirm = vi.spyOn(confirmation, 'confirm');
    fixture.componentRef.setInput('email', null);

    component.confirmForgotPassword();

    expect(confirm).not.toHaveBeenCalled();
  });

  // Typing and deleting leaves nothing to submit or to lose.
  it('keeps Change password disabled until something is typed, and again once it is erased', () => {
    const button = () =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );
    expect(button()?.disabled).toBe(true);

    component.currentPassword.setValue('a');
    fixture.detectChanges();
    expect(button()?.disabled).toBe(false);
    expect(component.hasUnsavedChanges()).toBe(true);

    component.currentPassword.setValue('');
    fixture.detectChanges();
    expect(button()?.disabled).toBe(true);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('clears everything typed on Discard', () => {
    fill('OldPassword1!', 'NewPassword1!');
    fixture.detectChanges();
    const discard = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.trim() === 'Discard');
    expect(discard?.disabled).toBe(false);

    discard?.click();
    fixture.detectChanges();

    expect(component.currentPassword.value).toBe('');
    expect(component.passwordForm.getRawValue()).toEqual({ password: '', confirmPassword: '' });
    expect(component.hasUnsavedChanges()).toBe(false);
    expect(discard?.disabled).toBe(true);
  });

  // The server may already have revoked the old refresh token when the user leaves the page; the
  // new pair must be stored anyway, or the next refresh signs them out.
  it('stores the new token pair even if the page is left while the request is in flight', () => {
    const response = new Subject<AccessModel>();
    auth.changePassword.mockReturnValue(response);
    fill('OldPassword1!', 'NewPassword1!');

    component.save();
    fixture.destroy();
    response.next(tokens);
    response.complete();

    expect(session.replaceTokenPair).toHaveBeenCalledWith(tokens);
  });

  // Logout pressed while the request was in flight: storing the late pair would sign the user back
  // in, so it is revoked instead.
  it('revokes a late token pair instead of storing it after a logout', () => {
    const response = new Subject<AccessModel>();
    auth.changePassword.mockReturnValue(response);
    fill('OldPassword1!', 'NewPassword1!');

    component.save();
    session.isAuthenticated.mockReturnValue(false);
    response.next(tokens);
    response.complete();

    expect(session.replaceTokenPair).not.toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalledWith({ refreshToken: tokens.refreshToken });
  });

  // A logged out and B logged in before the answer: the late pair of A must not replace B's session.
  it('revokes a late token pair when another user is signed in by then', () => {
    const response = new Subject<AccessModel>();
    auth.changePassword.mockReturnValue(response);
    fill('OldPassword1!', 'NewPassword1!');

    component.save();
    session.accessModel.mockReturnValue({ accessToken: tokenOf('user-b') });
    response.next(tokens);
    response.complete();

    expect(session.replaceTokenPair).not.toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalledWith({ refreshToken: tokens.refreshToken });
  });
});
