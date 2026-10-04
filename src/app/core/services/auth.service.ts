import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccessModel } from '../models/auth/auth.models';
import { LoginCommand } from '../models/auth/login.command';
import { RefreshCommand } from '../models/auth/refresh.command';
import { LogoutCommand } from '../models/auth/logout.command';
import { ChangePasswordCommand } from '../models/auth/change-password.command';
import { ForgotPasswordCommand } from '../models/auth/forgot-password.command';
import { ResetPasswordCommand } from '../models/auth/reset-password.command';
import { adminApiUrl } from '../constants/api-url.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${adminApiUrl}/auth`;
  private readonly accountUrl = `${adminApiUrl}/account`;

  // POST /auth/login
  login(command: LoginCommand): Observable<AccessModel> {
    return this.http.post<AccessModel>(`${this.baseUrl}/login`, command);
  }

  // POST /auth/refresh
  refresh(command: RefreshCommand): Observable<AccessModel> {
    return this.http.post<AccessModel>(`${this.baseUrl}/refresh`, command);
  }

  resendEmailConfirmation(command: { email: string }): Observable<void> {
    return this.http.post<void>(`${this.accountUrl}/email-confirmation/resend`, command);
  }

  // DELETE /auth/logout
  logout(command: LogoutCommand): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/logout`, { body: command });
  }

  changePassword(command: ChangePasswordCommand): Observable<AccessModel> {
    return this.http.put<AccessModel>(`${this.accountUrl}/change-password`, command);
  }

  forgotPassword(command: ForgotPasswordCommand): Observable<void> {
    return this.http.post<void>(`${this.accountUrl}/forgot-password`, command);
  }

  resetPassword(command: ResetPasswordCommand): Observable<void> {
    return this.http.post<void>(`${this.accountUrl}/reset-password`, command);
  }
}
