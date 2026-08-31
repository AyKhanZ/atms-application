import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { WorkTicketsService } from './work-tickets.service';

describe('WorkTicketsService', () => {
  let service: WorkTicketsService;
  let http: HttpTestingController;
  const collectionUrl = `${projectApiUrl}/project/project-1/work-tickets`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WorkTicketsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads a cursor page filtered by milestone', () => {
    service
      .getWorkTickets('project-1', {
        cursor: 'next-page',
        pageSize: 25,
        milestoneId: 'milestone-1',
      })
      .subscribe();

    const request = http.expectOne(
      `${collectionUrl}?pageSize=25&cursor=next-page&milestoneId=milestone-1`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [], nextCursor: null, hasMore: false, pageSize: 25 });
  });

  it('creates a ticket without a client-provided status', () => {
    const command = {
      title: 'Release checklist',
      description: null,
      milestoneId: 'milestone-1',
      workTicketTypeId: 2,
      priorityId: 3,
      deadline: null,
      assigneeId: null,
    };

    service.createWorkTicket('project-1', command).subscribe();

    const request = http.expectOne(collectionUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.body).not.toHaveProperty('workTicketStatusId');
    request.flush('ticket-1');
  });

  it('updates a ticket with the selected status', () => {
    const command = {
      title: 'Release checklist',
      description: null,
      milestoneId: 'milestone-1',
      workTicketTypeId: 2,
      priorityId: 3,
      workTicketStatusId: 4,
      deadline: null,
      assigneeId: null,
    };

    service.updateWorkTicket('project-1', 'ticket-1', command).subscribe();

    const request = http.expectOne(`${collectionUrl}/ticket-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(command);
    request.flush(null);
  });

  it('deletes a ticket from the selected project', () => {
    service.deleteWorkTicket('project-1', 'ticket-1').subscribe();

    const request = http.expectOne(`${collectionUrl}/ticket-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
