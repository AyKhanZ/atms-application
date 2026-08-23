import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/paginated.model';
import {
  CreateOrganizationCommand,
  OrganizationListFilter,
  OrganizationListItemModel,
  OrganizationModel,
  UpdateOrganizationCommand,
} from '../models/organizations/organizations.models';
import { projectApiUrl } from '../constants/api-url.constants';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${projectApiUrl}/organization`;

  getOrganizations(filter: OrganizationListFilter): Observable<PaginatedResponse<OrganizationListItemModel>> {
    let params = new HttpParams().set('Page', filter.page).set('PageSize', filter.pageSize);

    if (filter.search) params = params.set('Search', filter.search);
    if (filter.createdFrom) params = params.set('CreatedFrom', filter.createdFrom);
    if (filter.createdTo) params = params.set('CreatedTo', filter.createdTo);
    if (filter.sortBy) params = params.set('SortBy', filter.sortBy);
    if (filter.sortDirection !== undefined) params = params.set('SortDirection', filter.sortDirection);

    return this.http.get<PaginatedResponse<OrganizationListItemModel>>(this.baseUrl, { params });
  }

  getOrganization(id: string): Observable<OrganizationModel> {
    return this.http.get<OrganizationModel>(`${this.baseUrl}/${id}`);
  }

  createOrganization(command: CreateOrganizationCommand): Observable<string> {
    return this.http.post<string>(this.baseUrl, this.toFormData(command));
  }

  updateOrganization(command: UpdateOrganizationCommand): Observable<void> {
    const formData = this.toFormData(command);
    formData.append('Id', command.id);

    return this.http.put<void>(this.baseUrl, formData);
  }

  deleteOrganization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private toFormData(command: CreateOrganizationCommand | UpdateOrganizationCommand): FormData {
    const formData = new FormData();
    formData.append('Title', command.title);
    formData.append('Voen', command.voen);

    if (command.logo) {
      formData.append('Logo', command.logo);
    }

    return formData;
  }
}
