import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { NotificationPageModel, NotificationSummaryModel } from '../models/notifications';

/** The bell shows the newest ten; the rest is on the Notifications page. */
export const NOTIFICATIONS_LATEST_SIZE = 10;

/** One page of the Notifications page; Load more brings the next. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${projectApiUrl}/notifications`;

  getNotifications(options: {
    pageSize: number;
    unreadOnly?: boolean;
    cursor?: string | null;
  }): Observable<NotificationPageModel> {
    let params = new HttpParams().set('pageSize', options.pageSize);
    if (options.unreadOnly) params = params.set('unreadOnly', true);
    if (options.cursor) params = params.set('cursor', options.cursor);
    return this.http.get<NotificationPageModel>(this.url, { params });
  }

  getSummary(): Observable<NotificationSummaryModel> {
    return this.http.get<NotificationSummaryModel>(`${this.url}/summary`);
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/read`, null);
  }

  markUnread(id: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/unread`, null);
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.url}/read-all`, null);
  }
}
