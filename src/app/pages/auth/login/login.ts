import { Component, inject } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthStoreActions, AuthStoreSelectors } from '../../../store/auth';
import { LoginNavigationState } from '../../../core/models/auth/login-navigation-state';

interface LoginCommand {
  email: FormControl<string>;
  password: FormControl<string>;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    PasswordModule,
    RouterLink,
  ],
})
export class LoginComponent {
  private readonly store = inject(Store);
  private fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group<LoginCommand>({
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    password: this.fb.control('', [Validators.required, Validators.maxLength(40)]),
  });

  isLoading = this.store.selectSignal(AuthStoreSelectors.isLoading);
  /** Set by the page that sent the user here: reset password, or "forgot password" in Settings. */
  readonly notice = loginNotice(history.state as LoginNavigationState | null);

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }
    this.store.dispatch(
      AuthStoreActions.login({
        command: {
          email: this.form.controls.email.value,
          password: this.form.controls.password.value,
        },
      }),
    );
  }
}

function loginNotice(state: LoginNavigationState | null): string | null {
  if (state?.passwordChanged) return 'Password changed. Sign in with the new password.';
  if (state?.resetSentTo) return `Check ${state.resetSentTo} for a password reset link.`;
  return null;
}
