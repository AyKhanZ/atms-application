import { Component, inject, signal } from '@angular/core';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatInput } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
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
    MatCard,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    MatCardContent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIcon,
    MatButton,
    RouterLink,
    MatIconButton,
    MatInput,
  ],
})
export class LoginComponent {
  private readonly store = inject(Store);
  private fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group<LoginCommand>({
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    password: this.fb.control('', [Validators.required, Validators.maxLength(40)]),
  });

  hidePassword = signal(true);
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
