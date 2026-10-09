import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { validationMessage } from '../../../core/utils/http-error.utils';
import { LoginNavigationState } from '../../../core/models/auth/login-navigation-state';
import { NewPasswordFieldsComponent } from '../../../shared/components/new-password-fields/new-password-fields.component';
import { createNewPasswordForm } from '../../../shared/components/new-password-fields/new-password.form';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  imports: [ButtonModule, ReactiveFormsModule, RouterLink, NewPasswordFieldsComponent, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = this.route.snapshot.queryParamMap.get('token');

  readonly form = createNewPasswordForm();
  readonly loading = signal(false);
  readonly invalidToken = signal(!this.token);
  readonly passwordRulesPulse = signal(false);
  private pulseTimeout?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.pulseTimeout));
  }

  onSubmit(): void {
    if (this.loading() || !this.token || this.invalidToken()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.pulsePasswordRules();
      return;
    }

    this.loading.set(true);
    this.auth
      .resetPassword({ ...this.form.getRawValue(), token: this.token })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => {
          const state: LoginNavigationState = { passwordChanged: true };
          void this.router.navigate(['/login'], { state });
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401 || error.status === 404) {
            this.invalidToken.set(true);
            return;
          }
          this.snackBar.error(
            validationMessage(error) ?? this.transloco.translate('auth.resetFailed'),
          );
        },
      });
  }

  private pulsePasswordRules(): void {
    if (!this.form.controls.password.value && !this.form.controls.confirmPassword.value) return;
    clearTimeout(this.pulseTimeout);
    this.passwordRulesPulse.set(false);
    this.pulseTimeout = setTimeout(() => {
      this.passwordRulesPulse.set(true);
      this.pulseTimeout = setTimeout(() => this.passwordRulesPulse.set(false), 650);
    });
  }
}
