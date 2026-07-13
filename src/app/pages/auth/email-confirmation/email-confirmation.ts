import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../core/services/auth.service';
import { SnackBarService } from '../../../core/services/snack-bar.service';

@Component({
  selector: 'app-email-confirmation',
  templateUrl: './email-confirmation.html',
  styleUrls: ['./email-confirmation.scss'],
  imports: [ButtonModule, FloatLabelModule, InputTextModule, ReactiveFormsModule, RouterLink],
})
export class EmailConfirmationComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(SnackBarService);

  readonly isResending = signal(false);
  readonly resendSent = signal(false);
  readonly isSuccess = computed(() => this.route.snapshot.queryParamMap.get('status') === 'success');
  readonly iconClass = computed(() => this.isSuccess() ? 'pi pi-check' : 'pi pi-times');
  readonly title = computed(() => this.isSuccess() ? 'Email confirmed' : 'Confirmation failed');
  readonly subtitle = computed(() => this.isSuccess()
    ? 'Your account is active. You can now sign in and continue working.'
    : 'The confirmation link is invalid or expired. Enter your email and we will send a new link.');
  readonly note = computed(() => this.isSuccess()
    ? 'Use the login and temporary password from your email. You can update your password after signing in.'
    : 'For security, confirmation links work for a limited time only.');

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

    this.authService.resendEmailConfirmation(this.resendForm.getRawValue())
      .pipe(finalize(() => this.isResending.set(false)))
      .subscribe({
        next: () => {
          this.resendSent.set(true);
          this.snackBar.success('A new confirmation link has been sent to your email.');
        },
        error: () => {
          this.snackBar.error('Could not send a new confirmation link. Please try again.');
        },
      });
  }
}