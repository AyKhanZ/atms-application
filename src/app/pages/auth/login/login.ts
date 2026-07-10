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
