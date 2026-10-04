import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PasswordValidators } from '../../validators/password.validators';

export type NewPasswordForm = FormGroup<{
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

export function createNewPasswordForm(): NewPasswordForm {
  return new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(40),
          PasswordValidators.strongPassword(),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: PasswordValidators.passwordsMatch('password', 'confirmPassword') },
  );
}
