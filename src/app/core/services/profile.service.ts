import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { adminApiUrl } from '../constants/api-url.constants';
import { ProfileModel } from '../models/profile/profile.model';
import { UpdateProfileSettingsCommand } from '../models/profile/update-profile-settings.command';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly url = `${adminApiUrl}/profile`;

  get(): Observable<ProfileModel> {
    return this.http.get<ProfileModel>(this.url);
  }

  updateLanguage(language: string): Observable<void> {
    return this.http.patch<void>(`${this.url}/language`, { language });
  }

  update(command: UpdateProfileSettingsCommand): Observable<ProfileModel> {
    const data = new FormData();
    data.append('name', command.name);
    data.append('surname', command.surname);
    data.append('phoneNumber', command.phoneNumber);
    data.append('position', command.position);
    data.append('languageId', String(command.languageId));
    data.append('birthDate', command.birthDate);
    data.append('genderId', String(command.genderId));
    data.append('maritalStatusId', String(command.maritalStatusId));
    if (command.avatar) data.append('avatar', command.avatar, command.avatar.name);

    return this.http.put<ProfileModel>(`${this.url}/settings`, data);
  }
}
