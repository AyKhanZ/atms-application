import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
    return this.http.get<DashboardModel>(`${projectApiUrl}/dashboard`, { params });
  }
}
