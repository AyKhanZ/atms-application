import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import {
  CreateWorkTaskCommand,
  MoveWorkTaskCommand,
  UpdateWorkTaskCommand,
  WorkTaskFilter,
  WorkTaskModel,
  WorkTaskPageModel,
} from '../models/work-tasks';

@Injectable({ providedIn: 'root' })
export class WorkTasksService {
  private readonly http = inject(HttpClient);

  getWorkTask(projectId: string, workTaskId: string): Observable<WorkTaskModel> {
    return this.http.get<WorkTaskModel>(`${this.url(projectId)}/${workTaskId}`);
  }

  getWorkTasks(projectId: string, filter: WorkTaskFilter = {}): Observable<WorkTaskPageModel> {
    let params = new HttpParams().set('pageSize', filter.pageSize ?? 10);
    if (filter.search?.trim()) params = params.set('search', filter.search.trim());
    if (filter.cursor) params = params.set('cursor', filter.cursor);
    if (filter.workTicketId) params = params.set('workTicketId', filter.workTicketId);
    if (filter.parentWorkTaskId) params = params.set('parentWorkTaskId', filter.parentWorkTaskId);
    if (filter.rootTasksOnly) params = params.set('rootTasksOnly', true);
    return this.http.get<WorkTaskPageModel>(this.url(projectId), { params });
  }

  createWorkTask(projectId: string, command: CreateWorkTaskCommand): Observable<string> {
    return this.http.post<string>(this.url(projectId), command);
  }

  updateWorkTask(
    projectId: string,
    workTaskId: string,
    command: UpdateWorkTaskCommand,
  ): Observable<void> {
    return this.http.put<void>(`${this.url(projectId)}/${workTaskId}`, command);
  }

  /** Deletes the task together with its subtasks. */
  deleteWorkTask(projectId: string, workTaskId: string): Observable<void> {
    return this.http.delete<void>(`${this.url(projectId)}/${workTaskId}`);
  }

  /** A card dropped on the board: status and place between two neighbours, nothing else. */
  moveWorkTask(
    projectId: string,
    workTaskId: string,
    command: MoveWorkTaskCommand,
  ): Observable<void> {
    return this.http.patch<void>(`${this.url(projectId)}/${workTaskId}/position`, command);
  }

  /** A card dropped on another day of the calendar. */
  updateWorkTaskDeadline(
    projectId: string,
    workTaskId: string,
    deadline: string | null,
  ): Observable<void> {
    return this.http.patch<void>(`${this.url(projectId)}/${workTaskId}/deadline`, { deadline });
  }

  private url(projectId: string): string {
    return `${projectApiUrl}/project/${projectId}/work-tasks`;
  }
}
