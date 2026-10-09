import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { AuthService } from '../../../core/services/auth.service';
import { serverErrorMessage } from '../../../core/utils/http-error.utils';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
  imports: [ButtonModule, FloatLabelModule, InputTextModule, ReactiveFormsModule, RouterLink, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);
  readonly loading = signal(false);
  readonly sent = signal(false);

  readonly form = new FormGroup({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(100)],
    }),
  });

  onSubmit(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.auth
      .forgotPassword({ email: this.form.controls.email.value.trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => this.sent.set(true),
        error: (error: HttpErrorResponse) =>
          this.snackBar.error(
            serverErrorMessage(error, this.transloco.translate('auth.resetLinkFailed')),
          ),
      });
  }
}
