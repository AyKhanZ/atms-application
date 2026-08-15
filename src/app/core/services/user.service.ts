import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MeModel } from '../models/users/me.model';
import { RoleModel } from '../models/users/user.models';
import { adminApiUrl } from '../constants/api-url.constants';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${adminApiUrl}/me`;

  // GET /me
  getMe(): Observable<MeModel> {
    return this.http.get<MeModel>(this.baseUrl);
  }

  // GET /me/roles
  getRoles(): Observable<RoleModel[]> {
    return this.http.get<RoleModel[]>(`${this.baseUrl}/roles`);
  }

  // GET /me/permissions
  getPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/permissions`);
  }
}
