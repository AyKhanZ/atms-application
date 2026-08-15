import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse } from '../models/paginated.model';
import {
  CreateWorkProjectCommand,
  UpdateWorkProjectCommand,
  UpdateWorkProjectStatusCommand,
  WorkProjectItemModel,
  WorkProjectListFilter,
  WorkProjectModel,
  WorkProjectParticipantCandidateModel,
} from '../models/work-projects';
import { projectApiUrl } from '../constants/api-url.constants';

@Injectable({ providedIn: 'root' })
export class WorkProjectsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${projectApiUrl}/project`;

  getProjects(filter: WorkProjectListFilter): Observable<PaginatedResponse<WorkProjectItemModel>> {
    let params = new HttpParams().set('Page', filter.page).set('PageSize', filter.pageSize);
    if (filter.search) params = params.set('Search', filter.search);
    if (filter.startDate) params = params.set('StartDate', filter.startDate);
    if (filter.endDate) params = params.set('EndDate', filter.endDate);
    if (filter.projectTypeId) params = params.set('ProjectTypeId', filter.projectTypeId);
    if (filter.projectKindId) params = params.set('ProjectKindId', filter.projectKindId);
    if (filter.projectStatusId) params = params.set('ProjectStatusId', filter.projectStatusId);
    if (filter.sortBy) params = params.set('SortBy', filter.sortBy);
    if (filter.sortDirection !== undefined) params = params.set('SortDirection', filter.sortDirection);
    return this.http.get<PaginatedResponse<WorkProjectItemModel>>(this.baseUrl, { params });
  }

  getProject(id: string): Observable<WorkProjectModel> {
    return this.http.get<WorkProjectModel>(`${this.baseUrl}/${id}`);
  }

  getTeamMembers(): Observable<WorkProjectParticipantCandidateModel[]> {
    return this.http.get<WorkProjectParticipantCandidateModel[]>(`${this.baseUrl}/team-members`);
  }

  createProject(command: CreateWorkProjectCommand): Observable<string> {
    return this.http.post<string>(this.baseUrl, command);
  }

  updateProject(command: UpdateWorkProjectCommand): Observable<void> {
    return this.http.put<void>(this.baseUrl, command);
  }

  updateStatus(id: string, projectStatusId: number): Observable<void> {
    const command: UpdateWorkProjectStatusCommand = { projectStatusId };
    return this.http.patch<void>(`${this.baseUrl}/status/${id}`, command);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
