import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { WorkTasksService } from './work-tasks.service';

describe('WorkTasksService', () => {
  let service: WorkTasksService;
  let http: HttpTestingController;
  const url = `${projectApiUrl}/project/project-1/work-tasks`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WorkTasksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads top-level ticket tasks with cursor pagination', () => {
    service.getWorkTasks('project-1', { workTicketId: 'ticket-1', rootTasksOnly: true, cursor: 'next', pageSize: 10 }).subscribe();

    const request = http.expectOne(`${url}?pageSize=10&cursor=next&workTicketId=ticket-1&rootTasksOnly=true`);
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 10 });
  });

  it('creates a subtask without a client-provided level or status', () => {
    const command = { workTicketId: 'ticket-1', parentWorkTaskId: 'task-1', title: 'Subtask', priorityId: 2 };
    service.createWorkTask('project-1', command).subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.body).not.toHaveProperty('level');
    expect(request.request.body).not.toHaveProperty('statusId');
    request.flush('subtask-1');
  });

  it('updates and deletes a task by project-scoped id', () => {
    const command = { title: 'Task', priorityId: 1, statusId: 2 };
    service.updateWorkTask('project-1', 'task-1', command).subscribe();
    const update = http.expectOne(`${url}/task-1`);
    expect(update.request.method).toBe('PUT');
    update.flush(null);

    service.deleteWorkTask('project-1', 'task-1').subscribe();
    const remove = http.expectOne(`${url}/task-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });
});
