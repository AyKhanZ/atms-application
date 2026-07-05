import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { SnackBarService } from '../../../core/services/snack-bar.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
  imports: [
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class ForgotPasswordComponent {
  // private readonly store = inject(Store);
  private readonly snackBar = inject(SnackBarService);

  readonly form = new FormGroup({
    email: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(100)],
    }),
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.snackBar.success('Password reset link sent to email.');
    //   this.store.dispatch(AuthActions.login({ credentials: this.form.getRawValue() }));
  }
}
