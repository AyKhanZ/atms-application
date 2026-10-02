import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { COMMENTS_PAGE_SIZE, CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let http: HttpTestingController;
  const url = `${projectApiUrl}/project/project-1/comments`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CommentsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the first page of a task without a cursor', () => {
    service.getComments('project-1', 'task-1').subscribe();

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.get('workTaskId')).toBe('task-1');
    expect(request.request.params.get('pageSize')).toBe(String(COMMENTS_PAGE_SIZE));
    expect(request.request.params.has('cursor')).toBe(false);
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 20 });
  });

  it('reads the next page by its cursor', () => {
    service.getComments('project-1', 'task-1', 'next').subscribe();

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.get('cursor')).toBe('next');
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 20 });
  });

  it('reads one comment', () => {
    service.getComment('project-1', 'c1').subscribe();
    http.expectOne({ method: 'GET', url: `${url}/c1` }).flush({});
  });

  it('sends, changes and deletes a comment', () => {
    service.create('project-1', { workTaskId: 'task-1', text: 'Hi' }).subscribe();
    const created = http.expectOne({ method: 'POST', url });
    expect(created.request.body).toEqual({ workTaskId: 'task-1', text: 'Hi' });
    created.flush({});

    service.update('project-1', 'c1', { text: 'Edited' }).subscribe();
    const updated = http.expectOne({ method: 'PUT', url: `${url}/c1` });
    expect(updated.request.body).toEqual({ text: 'Edited' });
    updated.flush({});

    service.delete('project-1', 'c1').subscribe();
    http.expectOne({ method: 'DELETE', url: `${url}/c1` }).flush(null);
  });
});
