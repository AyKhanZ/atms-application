import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DictionaryModel } from '../models/dictionary.model';
import { LanguageModel } from '../models/language.model';
import { WorkProjectRoleModel } from '../models/work-projects';
import { adminApiUrl, projectApiUrl } from '../constants/api-url.constants';

@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${adminApiUrl}/dictionary`;
  private readonly projectBaseUrl = `${projectApiUrl}/dictionary`;

  // GET /dictionary/genders
  getGenderDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.baseUrl}/genders`);
  }

  // GET /dictionary/marital-statuses
  getMaritalStatusDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.baseUrl}/marital-statuses`);
  }

  getLanguageDictionaries(): Observable<LanguageModel[]> {
    return this.http.get<LanguageModel[]>(`${this.baseUrl}/languages`);
  }

  // GET /dictionary/user-statuses
  getUserStatusDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.baseUrl}/user-statuses`);
  }

  // GET /dictionary/roles
  getRoleDictionaries(): Observable<DictionaryModel<string>[]> {
    return this.http.get<DictionaryModel<string>[]>(`${this.baseUrl}/roles`);
  }

  // GET /dictionary/permissions
  getPermissionDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.baseUrl}/permissions`);
  }

  getProjectTypeDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.projectBaseUrl}/project-types`);
  }

  getProjectKindDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.projectBaseUrl}/project-kinds`);
  }

  getProjectStatusDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.projectBaseUrl}/project-statuses`);
  }

  getProjectRoleDictionaries(): Observable<WorkProjectRoleModel[]> {
    return this.http.get<WorkProjectRoleModel[]>(`${this.projectBaseUrl}/project-roles`);
  }
}
