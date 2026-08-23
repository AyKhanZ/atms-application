import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import {
  CreateWorkGroupCommand,
  UpdateWorkGroupCommand,
  WorkGroupModel,
} from '../models/work-groups';

@Injectable({ providedIn: 'root' })
export class WorkGroupsService {
  private readonly http = inject(HttpClient);
  private readonly projectBaseUrl = `${projectApiUrl}/project`;

  getWorkGroups(projectId: string): Observable<WorkGroupModel[]> {
    return this.http.get<WorkGroupModel[]>(this.workGroupsUrl(projectId));
  }

  createWorkGroup(projectId: string, command: CreateWorkGroupCommand): Observable<string> {
    return this.http.post<string>(this.workGroupsUrl(projectId), command);
  }

  updateWorkGroup(
    projectId: string,
    workGroupId: string,
    command: UpdateWorkGroupCommand,
  ): Observable<void> {
    return this.http.put<void>(`${this.workGroupsUrl(projectId)}/${workGroupId}`, command);
  }

  deleteWorkGroup(projectId: string, workGroupId: string): Observable<void> {
    return this.http.delete<void>(`${this.workGroupsUrl(projectId)}/${workGroupId}`);
  }

  private workGroupsUrl(projectId: string): string {
    return `${this.projectBaseUrl}/${projectId}/work-groups`;
  }
}
