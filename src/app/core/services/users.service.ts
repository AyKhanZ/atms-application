import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../models/paginated.model';
import {
  UserListFilter,
  UserListItemModel,
  UserModel,
} from '../models/users/users.models';
import { UpdateUserStatusCommand } from '../models/users/update-user-status.command';
import { RegisterUserCommand } from '../models/users/register-user.command';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  // GET /users
  getUsers(filter: UserListFilter): Observable<PaginatedResponse<UserListItemModel>> {
    let params = new HttpParams().set('Page', filter.page).set('PageSize', filter.pageSize);

    if (filter.search) params = params.set('Search', filter.search);
    if (filter.userStatusId) params = params.set('UserStatusId', filter.userStatusId);
    if (filter.createdFrom) params = params.set('CreatedFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('CreatedTo', filter.createdTo);
    if (filter.sortBy) params = params.set('SortBy', filter.sortBy);
    if (filter.sortDirection !== undefined)
      params = params.set('SortDirection', filter.sortDirection);

    return this.http.get<PaginatedResponse<UserListItemModel>>(this.baseUrl, { params });
  }

  // GET /users/:id
  getUser(id: string): Observable<UserModel> {
    return this.http.get<UserModel>(`${this.baseUrl}/${id}`);
  }

  // POST /account/register
  registerUser(command: RegisterUserCommand): Observable<UserModel> {
    return this.http.post<UserModel>(`${environment.apiUrl}/account/register`, command);
  }

  // PATCH /users/status/:id
  updateUserStatus(id: string, command: UpdateUserStatusCommand): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/status/${id}`, command);
  }
}
