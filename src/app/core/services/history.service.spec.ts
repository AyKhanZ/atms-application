import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { HISTORY_PAGE_SIZE, HistoryService } from './history.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let http: HttpTestingController;
  const url = `${projectApiUrl}/project/project-1/history`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HistoryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the project history without a scope parameter', () => {
    service.getHistory('project-1', { kind: 'project' }).subscribe();

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.keys()).toEqual(['pageSize']);
    expect(request.request.params.get('pageSize')).toBe(String(HISTORY_PAGE_SIZE));
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 20 });
  });

  it('reads the next page of a task by its cursor', () => {
    service.getHistory('project-1', { kind: 'task', workTaskId: 'task-1' }, 'next').subscribe();

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.get('workTaskId')).toBe('task-1');
    expect(request.request.params.get('cursor')).toBe('next');
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 20 });
  });

  it('reads the statuses of a ticket', () => {
    service.getStates('project-1', { kind: 'ticket', workTicketId: 'ticket-1' }).subscribe();

    const request = http.expectOne((req) => req.url === `${url}/states`);
    expect(request.request.params.get('workTicketId')).toBe('ticket-1');
    request.flush([]);
  });
});
