import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { GlobalSearchModel, GlobalSearchPageModel } from '../models/global-search';
import { WorkItemKind } from '../models/work-items';

/** Route segment the API expects for each kind. The palette sends the number, the page the name. */
const itemTypeRoutes: Record<WorkItemKind, string> = {
  [WorkItemKind.Project]: 'project',
  [WorkItemKind.Ticket]: 'ticket',
  [WorkItemKind.Task]: 'task',
  [WorkItemKind.Subtask]: 'subtask',
};

@Injectable({ providedIn: 'root' })
export class GlobalSearchService {
  private readonly http = inject(HttpClient);

  search(query: string, take = 5): Observable<GlobalSearchModel> {
    const params = new HttpParams().set('q', query.trim()).set('take', take);
    return this.http.get<GlobalSearchModel>(this.url, { params });
  }

  /** Empty query: the server answers with the recently opened items instead of matches. */
  recent(): Observable<GlobalSearchModel> {
    return this.http.get<GlobalSearchModel>(this.url);
  }

  page(
    itemType: WorkItemKind,
    query: string,
    cursor?: string | null,
    pageSize = 20,
  ): Observable<GlobalSearchPageModel> {
    let params = new HttpParams().set('q', query.trim()).set('pageSize', pageSize);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<GlobalSearchPageModel>(`${this.url}/${itemTypeRoutes[itemType]}`, {
      params,
    });
  }

  recordRecent(itemType: WorkItemKind, itemId: string): Observable<void> {
    return this.http.put<void>(`${this.url}/recent/${itemType}/${itemId}`, null);
  }

  private get url(): string {
    return `${projectApiUrl}/search`;
  }
}
