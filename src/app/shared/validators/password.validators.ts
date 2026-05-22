import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class PasswordValidators {
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.value;

      if (!password) {
        return null;
      }

      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasDigits = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*()\-_+=]/.test(password);

      const isPasswordValid = hasUpperCase && hasLowerCase && hasDigits && hasSpecialChar;
      const validationErrors = {
        hasUpperCase: !hasUpperCase,
        hasLowerCase: !hasLowerCase,
        hasDigits: !hasDigits,
        hasSpecialChar: !hasSpecialChar,
      };

      return isPasswordValid ? null : validationErrors;
    };
  }

  static passwordsMatch(
    passwordControlName: string,
    confirmPasswordControlName: string,
  ): ValidatorFn {
    return (form): ValidationErrors | null => {
      const password = form.get(passwordControlName)?.value;
      const confirmPassword = form.get(confirmPasswordControlName)?.value;

      if (!password) {
        return null;
      }

      return password === confirmPassword ? null : { mismatch: true };
    };
  }
}
