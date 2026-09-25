import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { DashboardModel, DashboardQuery } from '../models/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(query: DashboardQuery): Observable<DashboardModel> {
    let params = new HttpParams().set('period', query.period);
    if (query.projectId) params = params.set('projectId', query.projectId);
    if (query.period === 'custom' && query.from && query.to) {
      params = params.set('from', query.from).set('to', query.to);
    }
    return this.http.get<DashboardModel>(`${projectApiUrl}/dashboard`, { params }).pipe(
      map((model) => {
        if (
          !Array.isArray(model?.activities) ||
          model.activities.some(
            (activity) =>
              !activity?.subject ||
              !['task', 'ticket', 'project'].includes(activity.subject.type) ||
              typeof activity.subject.code !== 'string' ||
              typeof activity.subject.title !== 'string' ||
              typeof activity.subject.isDeleted !== 'boolean',
          )
        ) {
          throw new Error('Dashboard response is missing activity subjects.');
        }

        return model;
      }),
    );
  }
}
