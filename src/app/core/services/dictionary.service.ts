import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DictionaryModel } from '../models/dictionary.model';
import { environment } from '../../../environments/environment';
import { LanguageModel } from '../models/language.model';

@Injectable({ providedIn: 'root' })
export class DictionaryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dictionary`;

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
}
