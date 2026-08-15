import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { InvitedUserCommand, SaveSecurityCommand } from '../models/onboarding/onboarding.commands';
import { OnboardingCompletionModel, OnboardingModel } from '../models/onboarding/onboarding.models';
import { adminApiUrl } from '../constants/api-url.constants';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${adminApiUrl}/onboarding`;

  get(): Observable<OnboardingModel> {
    return this.http.get<OnboardingModel>(this.baseUrl);
  }

  savePersonalInfo(formData: FormData): Observable<OnboardingModel> {
    return this.http.put<OnboardingModel>(`${this.baseUrl}/personal-info`, formData);
  }

  saveSecurity(command: SaveSecurityCommand): Observable<OnboardingModel> {
    return this.http.put<OnboardingModel>(`${this.baseUrl}/security`, command);
  }

  saveInvitations(users: InvitedUserCommand[], version: number): Observable<OnboardingModel> {
    return this.http.put<OnboardingModel>(`${this.baseUrl}/invitations`, { users, version });
  }

  skipInvitations(version: number): Observable<OnboardingModel> {
    return this.http.post<OnboardingModel>(`${this.baseUrl}/invitations/skip`, { version });
  }

  complete(version: number): Observable<OnboardingCompletionModel> {
    return this.http.post<OnboardingCompletionModel>(`${this.baseUrl}/complete`, { version });
  }
}
