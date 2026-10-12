import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/guest.guard';

// Only login and forgot-password send a signed-in user to the dashboard. Links from emails
// (confirm email, reset password) must open even when another account is signed in here.
export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then((c) => c.LoginComponent),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./forgot-password/forgot-password').then((c) => c.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password').then((c) => c.ResetPasswordComponent),
  },
  {
    path: 'email-confirmation',
    loadComponent: () =>
      import('./email-confirmation/email-confirmation').then((c) => c.EmailConfirmationComponent),
  },
];
