import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import {
  CreateWorkTicketCommand,
  UpdateWorkTicketCommand,
  WorkTicketFilter,
  WorkTicketModel,
  WorkTicketPageModel,
} from '../models/work-tickets';

@Injectable({ providedIn: 'root' })
export class WorkTicketsService {
  private readonly http = inject(HttpClient);
  private readonly projectBaseUrl = `${projectApiUrl}/project`;

  getWorkTicket(projectId: string, workTicketId: string): Observable<WorkTicketModel> {
    return this.http.get<WorkTicketModel>(`${this.workTicketsUrl(projectId)}/${workTicketId}`);
  }

  getWorkTickets(
    projectId: string,
    filter: WorkTicketFilter = {},
  ): Observable<WorkTicketPageModel> {
    let params = new HttpParams().set('pageSize', filter.pageSize ?? 50);
    if (filter.cursor) params = params.set('cursor', filter.cursor);
    if (filter.milestoneId) params = params.set('milestoneId', filter.milestoneId);

    return this.http.get<WorkTicketPageModel>(this.workTicketsUrl(projectId), { params });
  }

  createWorkTicket(projectId: string, command: CreateWorkTicketCommand): Observable<string> {
    return this.http.post<string>(this.workTicketsUrl(projectId), command);
  }

  updateWorkTicket(
    projectId: string,
    workTicketId: string,
    command: UpdateWorkTicketCommand,
  ): Observable<void> {
    return this.http.put<void>(`${this.workTicketsUrl(projectId)}/${workTicketId}`, command);
  }

  deleteWorkTicket(projectId: string, workTicketId: string): Observable<void> {
    return this.http.delete<void>(`${this.workTicketsUrl(projectId)}/${workTicketId}`);
  }

  private workTicketsUrl(projectId: string): string {
    return `${this.projectBaseUrl}/${projectId}/work-tickets`;
  }
}
