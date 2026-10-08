import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import {
  WorkTaskBoardAssigneeModel,
  WorkTaskBoardQuery,
  WorkTaskBoardOrder,
} from '../models/work-task-board';
import { WorkItemKind } from '../models/work-items';
import { WorkTaskPageModel } from '../models/work-tasks';
import { startOfToday } from '../utils/deadline.utils';

// server max page size
export const workTaskBoardMaxPageSize = 50;

@Injectable({ providedIn: 'root' })
export class WorkTaskBoardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${projectApiUrl}/work-tasks`;

  getPage(
    query: WorkTaskBoardQuery,
    order: WorkTaskBoardOrder,
    cursor: string | null,
    pageSize: number,
  ): Observable<WorkTaskPageModel> {
    let params = toParams(query)
      .set('sort', order.sort)
      .set('sortDirection', order.direction)
      .set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<WorkTaskPageModel>(this.url, { params });
  }

  // status id -> count, same filters
  getCounts(query: WorkTaskBoardQuery): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(`${this.url}/counts`, { params: toParams(query) });
  }

  getAssignees(projectIds: readonly string[]): Observable<WorkTaskBoardAssigneeModel[]> {
    let params = new HttpParams();
    for (const id of projectIds) params = params.append('projectIds', id);
    return this.http.get<WorkTaskBoardAssigneeModel[]>(`${this.url}/assignees`, { params });
  }
}

function toParams(query: WorkTaskBoardQuery): HttpParams {
  let params = new HttpParams();
  for (const id of query.projectIds) params = params.append('projectIds', id);
  for (const id of query.workTicketIds) params = params.append('workTicketIds', id);
  for (const id of query.assigneeUserIds) params = params.append('assigneeUserIds', id);
  for (const id of query.statusIds) params = params.append('statusIds', id);
  for (const id of query.priorityIds) params = params.append('priorityIds', id);
  // server uses its own scale here: 1 task, 2 subtask
  if (query.kind !== null) params = params.set('kind', query.kind === WorkItemKind.Task ? 1 : 2);
  if (query.unassigned) params = params.set('unassigned', true);
  if (query.search.trim()) params = params.set('search', query.search.trim());
  if (query.deadlineFrom) params = params.set('deadlineFrom', query.deadlineFrom);
  if (query.deadlineTo) params = params.set('deadlineTo', query.deadlineTo);
  if (query.noDeadline || query.deadline === 'none') params = params.set('noDeadline', true);
  // deadline is local midnight, overdue = before the start of the users today
  if (query.deadline === 'overdue' || query.overdue === true) {
    params = params.set('overdueBefore', startOfToday().toISOString());
  }
  if (query.overdue === false)
    params = params.set('excludeOverdueBefore', startOfToday().toISOString());
  return params;
}
