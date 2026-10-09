import { Component, computed, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
import { currentLanguage } from '../../../core/i18n/active-language';

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
    TranslocoDirective,
  ],
})
export class LoginComponent {
  private readonly store = inject(Store);
  private fb = inject(NonNullableFormBuilder);
  private readonly transloco = inject(TranslocoService);

  readonly form = this.fb.group<LoginCommand>({
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    password: this.fb.control('', [Validators.required, Validators.maxLength(40)]),
  });

  isLoading = this.store.selectSignal(AuthStoreSelectors.isLoading);
  // set by reset password or "forgot password" in settings; read again when the language changes
  readonly notice = computed(() => {
    currentLanguage();
    const state = history.state as LoginNavigationState | null;
    if (state?.passwordChanged) return this.transloco.translate('auth.passwordChanged');
    if (state?.resetSentTo) {
      return this.transloco.translate('auth.resetLinkSent', { email: state.resetSentTo });
    }
    return null;
  });

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
