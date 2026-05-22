import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UserListFilter,
  UserListResponse,
  UserModel,
} from '../models/users/users.models';
import { UpdateUserStatusCommand } from '../models/users/update-user-status.command';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  // GET /users
  getUsers(filter: UserListFilter): Observable<UserListResponse> {
    let params = new HttpParams().set('Page', filter.page).set('PageSize', filter.pageSize);

    if (filter.name) params = params.set('Name', filter.name);
    if (filter.surname) params = params.set('Surname', filter.surname);
    if (filter.email) params = params.set('Email', filter.email);
    if (filter.userStatusId) params = params.set('UserStatusId', filter.userStatusId);
    if (filter.createdFrom) params = params.set('CreatedFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('CreatedTo', filter.createdTo);
    if (filter.sortBy) params = params.set('SortBy', filter.sortBy);
    if (filter.sortDirection !== undefined)
      params = params.set('SortDirection', filter.sortDirection);

    return this.http.get<UserListResponse>(this.baseUrl, { params });
  }

  // GET /users/:id
  getUser(id: string): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.baseUrl}/${id}`);
  }

  // PATCH /users/status/:id
  updateUserStatus(id: string, command: UpdateUserStatusCommand): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/status/${id}`, command);
  }
}
