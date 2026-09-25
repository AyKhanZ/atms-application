import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { HistoryPageModel, HistoryScope, HistoryStateModel } from '../models/history';

/** Entries on one page: a row is one or two lines, and 10 would fill half of the column. */
export const HISTORY_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);

  getHistory(
    projectId: string,
    scope: HistoryScope,
    cursor?: string | null,
  ): Observable<HistoryPageModel> {
    let params = scopeParams(scope).set('pageSize', HISTORY_PAGE_SIZE);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<HistoryPageModel>(this.url(projectId), { params });
  }

  getStates(projectId: string, scope: HistoryScope): Observable<HistoryStateModel[]> {
    return this.http.get<HistoryStateModel[]>(`${this.url(projectId)}/states`, {
      params: scopeParams(scope),
    });
  }

  private url(projectId: string): string {
    return `${projectApiUrl}/project/${projectId}/history`;
  }
}

function scopeParams(scope: HistoryScope): HttpParams {
  const params = new HttpParams();
  switch (scope.kind) {
    case 'project':
      return params;
    case 'ticket':
      return params.set('workTicketId', scope.workTicketId);
    case 'task':
      return params.set('workTaskId', scope.workTaskId);
  }
}
