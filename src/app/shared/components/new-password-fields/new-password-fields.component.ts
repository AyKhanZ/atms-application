import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { TranslocoDirective } from '@jsverse/transloco';
import { PasswordRules } from '../password-rules/password-rules';
import { NewPasswordForm } from './new-password.form';

@Component({
  selector: 'app-new-password-fields',
  imports: [ReactiveFormsModule, PasswordModule, PasswordRules, TranslocoDirective],
  templateUrl: './new-password-fields.component.html',
  styleUrl: './new-password-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewPasswordFieldsComponent {
  readonly form = input.required<NewPasswordForm>();
  readonly pulse = input(false);
  readonly compact = input(false);
  readonly currentPassword = input<FormControl<string> | null>(null);
  readonly currentPasswordError = input('');
  readonly newPasswordError = input('');
  readonly forgotPassword = output<void>();

  get passwordValue(): string {
    return this.form().controls.password.value;
  }

  get confirmPasswordValue(): string {
    return this.form().controls.confirmPassword.value;
  }
}
