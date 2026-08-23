import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { WorkGroupsService } from './work-groups.service';

describe('WorkGroupsService', () => {
  let service: WorkGroupsService;
  let http: HttpTestingController;
  const collectionUrl = `${projectApiUrl}/project/project-1/work-groups`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WorkGroupsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the non-paginated project hierarchy', () => {
    service.getWorkGroups('project-1').subscribe();

    const request = http.expectOne(collectionUrl);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('creates a milestone under the selected group', () => {
    service
      .createWorkGroup('project-1', {
        title: 'Discovery',
        parentWorkGroupId: 'group-1',
      })
      .subscribe();

    const request = http.expectOne(collectionUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Discovery',
      parentWorkGroupId: 'group-1',
    });
    request.flush('milestone-1');
  });

  it('updates only the work-group name', () => {
    service.updateWorkGroup('project-1', 'group-1', { title: 'Delivery' }).subscribe();

    const request = http.expectOne(`${collectionUrl}/group-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ title: 'Delivery' });
    request.flush(null);
  });

  it('deletes the selected work group', () => {
    service.deleteWorkGroup('project-1', 'group-1').subscribe();

    const request = http.expectOne(`${collectionUrl}/group-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
