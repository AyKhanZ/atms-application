import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { WorkItemKind } from '../models/work-items';
import { GlobalSearchService } from './global-search.service';

describe('GlobalSearchService', () => {
  let service: GlobalSearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(GlobalSearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('trims the query and asks for the palette in one request', async () => {
    const result = firstValueFrom(service.search('  плат  '));
    const request = http.expectOne(
      (value) => value.url === `${projectApiUrl}/search` && value.params.get('q') === 'плат',
    );

    expect(request.request.params.get('take')).toBe('5');
    request.flush({ projects: { items: [], hasMore: false } });
    await result;
  });

  // An empty query is how the server is asked for the recently opened items.
  it('asks for recent items without a query', async () => {
    const result = firstValueFrom(service.recent());
    const request = http.expectOne(`${projectApiUrl}/search`);

    expect(request.request.params.keys()).toHaveLength(0);
    request.flush({ recent: [] });
    await result;
  });

  // The kind is a word in the address, not the number the payload carries.
  it.each([
    [WorkItemKind.Project, 'project'],
    [WorkItemKind.Ticket, 'ticket'],
    [WorkItemKind.Task, 'task'],
    [WorkItemKind.Subtask, 'subtask'],
  ])('reads a page of %s from its own route', async (itemType, segment) => {
    const result = firstValueFrom(service.page(itemType, 'плат'));
    const request = http.expectOne((value) => value.url === `${projectApiUrl}/search/${segment}`);

    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.has('cursor')).toBe(false);
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 20 });
    await result;
  });

  it('passes the continuation token on for the next page', async () => {
    const result = firstValueFrom(service.page(WorkItemKind.Task, 'плат', 'cursor-1', 30));
    const request = http.expectOne((value) => value.params.get('cursor') === 'cursor-1');

    expect(request.request.params.get('pageSize')).toBe('30');
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 30 });
    await result;
  });

  it('records an opened item under the current user', async () => {
    const result = firstValueFrom(service.recordRecent(WorkItemKind.Subtask, 'item-1'));
    const request = http.expectOne(`${projectApiUrl}/search/recent/4/item-1`);

    expect(request.request.method).toBe('PUT');
    request.flush(null);
    await result;
  });
});
