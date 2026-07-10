import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { SnackBarService } from '../../../core/services/snack-bar.service';
import { PasswordValidators } from '../../../shared/validators/password.validators';
import { PasswordRules } from '../../../shared/components/password-rules/password-rules';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.scss'],
  imports: [
    ButtonModule,
    FloatLabelModule,
    PasswordModule,
    ReactiveFormsModule,
    PasswordRules,
  ],
})
export class ResetPasswordComponent {
  // private readonly store = inject(Store);
  private readonly snackBar = inject(SnackBarService);
  // reset-password.ts

  readonly form = new FormGroup(
    {
      password: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(40),
          PasswordValidators.strongPassword(),
        ],
      }),
      confirmPassword: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    {
      validators: [PasswordValidators.passwordsMatch('password', 'confirmPassword')],
    },
  );
  passwordValue = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  confirmValue = toSignal(this.form.controls.confirmPassword.valueChanges, { initialValue: '' });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.snackBar.success('Password successfully updated.');
    //   this.store.dispatch(AuthActions.login({ credentials: this.form.getRawValue() }));
  }
}
