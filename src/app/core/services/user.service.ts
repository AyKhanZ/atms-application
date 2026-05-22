import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeModel, RoleModel } from '../models/users/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me`;

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
