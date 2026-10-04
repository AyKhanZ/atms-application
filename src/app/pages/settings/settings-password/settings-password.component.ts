import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { finalize, map, merge } from 'rxjs';
import { LoginNavigationState } from '../../../core/models/auth/login-navigation-state';
import { AuthService } from '../../../core/services/auth.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { serverErrorMessage, validationMessage } from '../../../core/utils/http-error.utils';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NewPasswordFieldsComponent } from '../../../shared/components/new-password-fields/new-password-fields.component';
import { createNewPasswordForm } from '../../../shared/components/new-password-fields/new-password.form';

const FORGOT_PASSWORD_DIALOG = 'settingsForgotPassword';

@Component({
  selector: 'app-settings-password',
  imports: [ReactiveFormsModule, ButtonModule, ConfirmDialogComponent, NewPasswordFieldsComponent],
  templateUrl: './settings-password.component.html',
  styleUrl: './settings-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly session = inject(AuthSessionService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(SnackBarService);
  private readonly destroyRef = inject(DestroyRef);

  /** The address the reset link goes to. Null while the profile is still loading. */
  readonly email = input<string | null>(null);

  readonly forgotPasswordDialog = FORGOT_PASSWORD_DIALOG;
  readonly saving = signal(false);
  readonly sendingReset = signal(false);
  readonly currentPasswordError = signal('');
  readonly newPasswordError = signal('');
  readonly rulesPulse = signal(false);

  readonly passwordForm = createNewPasswordForm();
  readonly currentPassword = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });
  /**
   * Anything typed at all. Judged by the values, not by dirty: typing a letter and deleting it
   * leaves nothing to submit and nothing to lose.
   */
  readonly hasInput = toSignal(
    merge(this.currentPassword.valueChanges, this.passwordForm.valueChanges).pipe(
      map(() => this.typedAnything()),
    ),
    { initialValue: false },
  );
  readonly canSubmit = computed(() => this.hasInput() && !this.saving());
  private pulseTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.pulseTimeout));

    // A server error describes the value that was sent; once the user edits it, the error is stale.
    this.currentPassword.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.currentPasswordError.set(''));
    merge(this.passwordForm.controls.password.valueChanges, this.currentPassword.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.newPasswordError.set(''));
  }

  hasUnsavedChanges(): boolean {
    return this.hasInput();
  }

  discard(): void {
    this.currentPassword.reset();
    this.passwordForm.reset();
    this.currentPasswordError.set('');
    this.newPasswordError.set('');
  }

  save(): void {
    if (!this.canSubmit()) return;
    this.currentPassword.markAsTouched();
    this.passwordForm.markAllAsTouched();
    if (this.currentPassword.invalid || this.passwordForm.invalid) {
      this.pulseRules();
      return;
    }

    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (password === this.currentPassword.value) {
      this.newPasswordError.set('Choose a password different from your current password.');
      return;
    }

    this.saving.set(true);
    this.auth
      .changePassword({
        oldPassword: this.currentPassword.value,
        newPassword: password,
        confirmPassword,
      })
      // Deliberately not cut off when the page is left: unsubscribing aborts the request, but the
      // server may already have changed the password and revoked the old refresh token. The new
      // pair must still be stored, or the next token refresh signs the user out.
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (tokens) => {
          this.session.replaceTokenPair(tokens);
          this.discard();
          this.snackBar.success('Password changed.');
        },
        error: (error: HttpErrorResponse) => this.handleSaveError(error),
      });
  }

  confirmForgotPassword(): void {
    const email = this.email();
    if (!email || this.sendingReset()) return;

    this.confirmation.confirm({
      key: FORGOT_PASSWORD_DIALOG,
      header: 'Reset your password?',
      message: `We will sign you out and send a password reset link to ${email}. Continue?`,
      acceptLabel: 'Send link',
      rejectLabel: 'Cancel',
      accept: () => this.sendResetLink(email),
    });
  }

  private handleSaveError(error: HttpErrorResponse): void {
    if (error.status === 423) {
      this.snackBar.warn(serverErrorMessage(error, 'Too many attempts. Try again in 15 minutes.'));
      return;
    }

    const oldPasswordMessage = validationMessage(error, 'OldPassword');
    const failures = error.error?.errors as { field?: string }[] | undefined;
    if (failures?.some((failure) => failure.field?.toLowerCase() === 'oldpassword')) {
      this.currentPasswordError.set(oldPasswordMessage ?? 'Current password is incorrect.');
      return;
    }

    this.snackBar.error(
      validationMessage(error) ?? serverErrorMessage(error, 'Could not change the password.'),
    );
  }

  private sendResetLink(email: string): void {
    this.sendingReset.set(true);
    this.auth
      .forgotPassword({ email })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.sendingReset.set(false)),
      )
      .subscribe({
        next: () => {
          // Nothing typed here survives the sign-out, so the unsaved-changes guard must not ask.
          this.discard();
          this.session.logout(false);
          // The address travels in navigation state, not the URL, so it stays out of history.
          const state: LoginNavigationState = { resetSentTo: email };
          void this.router.navigate(['/login'], { state });
        },
        error: (error: HttpErrorResponse) =>
          this.snackBar.error(serverErrorMessage(error, 'Could not send a password reset link.')),
      });
  }

  private pulseRules(): void {
    const { password, confirmPassword } = this.passwordForm.getRawValue();
    if (!password && !confirmPassword) return;

    clearTimeout(this.pulseTimeout);
    this.rulesPulse.set(false);
    this.pulseTimeout = setTimeout(() => {
      this.rulesPulse.set(true);
      this.pulseTimeout = setTimeout(() => this.rulesPulse.set(false), 650);
    });
  }

  private typedAnything(): boolean {
    const { password, confirmPassword } = this.passwordForm.getRawValue();
    return Boolean(this.currentPassword.value || password || confirmPassword);
  }
}
