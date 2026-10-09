import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../core/services/auth.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-email-confirmation',
  templateUrl: './email-confirmation.html',
  styleUrls: ['./email-confirmation.scss'],
  imports: [ButtonModule, FloatLabelModule, InputTextModule, ReactiveFormsModule, RouterLink, TranslocoDirective],
})
export class EmailConfirmationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);

  readonly isResending = signal(false);
  readonly resendSent = signal(false);
  readonly status = computed(() => this.route.snapshot.queryParamMap.get('status'));
  readonly isSuccess = computed(() => this.status() === 'success');
  readonly isAlreadyConfirmed = computed(() => this.status() === 'already-confirmed');
  readonly isFailed = computed(() => !this.isSuccess() && !this.isAlreadyConfirmed());
  readonly iconClass = computed(() => (this.isFailed() ? 'pi pi-times' : 'pi pi-check'));

  readonly resendForm = new FormGroup({
    email: new FormControl<string>(this.route.snapshot.queryParamMap.get('email') ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(100)],
    }),
  });

  resendConfirmation(): void {
    if (this.resendForm.invalid || this.isResending()) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isResending.set(true);
    this.resendSent.set(false);

    this.authService
      .resendEmailConfirmation(this.resendForm.getRawValue())
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: () => {
          this.resendSent.set(true);
          this.snackBar.success(this.transloco.translate('auth.confirmationResent'));
        },
        error: () => {
          this.snackBar.error(this.transloco.translate('auth.confirmationResendFailed'));
        },
      });
  }
}
