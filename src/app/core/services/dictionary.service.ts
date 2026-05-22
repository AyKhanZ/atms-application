import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DictionaryModel } from '../models/dictionary.model';
import { environment } from '../../../environments/environment';

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

  // GET /dictionary/user-statuses
  getUserStatusDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.baseUrl}/user-statuses`);
  }

  // GET /dictionary/permissions
  getPermissionDictionaries(): Observable<DictionaryModel[]> {
    return this.http.get<DictionaryModel[]>(`${this.baseUrl}/permissions`);
  }
}
