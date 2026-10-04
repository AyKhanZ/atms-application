import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let http: HttpTestingController;
  const url = `${projectApiUrl}/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the first page of everything without a cursor or a filter', () => {
    service.getNotifications({ pageSize: 10 }).subscribe();

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.get('pageSize')).toBe('10');
    expect(request.request.params.has('unreadOnly')).toBe(false);
    expect(request.request.params.has('cursor')).toBe(false);
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 10 });
  });

  it('reads the next unread page by its cursor', () => {
    service.getNotifications({ pageSize: 20, unreadOnly: true, cursor: 'next' }).subscribe();

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.get('unreadOnly')).toBe('true');
    expect(request.request.params.get('cursor')).toBe('next');
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 20 });
  });

  it('reads the unread count', () => {
    service.getSummary().subscribe();
    http.expectOne({ method: 'GET', url: `${url}/summary` }).flush({ unreadCount: 3 });
  });

  it('marks one read, one unread and all read', () => {
    service.markRead('n1').subscribe();
    http.expectOne({ method: 'POST', url: `${url}/n1/read` }).flush(null);

    service.markUnread('n1').subscribe();
    http.expectOne({ method: 'POST', url: `${url}/n1/unread` }).flush(null);

    service.markAllRead().subscribe();
    http.expectOne({ method: 'POST', url: `${url}/read-all` }).flush(null);
  });
});
