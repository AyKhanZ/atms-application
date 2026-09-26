import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests all accessible projects with the selected period', () => {
    service.getDashboard({ projectId: null, period: '30d', from: null, to: null }).subscribe();
    const request = http.expectOne((req) => req.url === `${projectApiUrl}/dashboard`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('period')).toBe('30d');
    expect(request.request.params.has('projectId')).toBe(false);
    request.flush({ activities: [] });
  });

  it('requests one project when its id is selected', () => {
    service.getDashboard({ projectId: 'project-1', period: '7d', from: null, to: null }).subscribe();
    const request = http.expectOne((req) => req.url === `${projectApiUrl}/dashboard`);
    expect(request.request.params.get('projectId')).toBe('project-1');
    expect(request.request.params.get('period')).toBe('7d');
    request.flush({ activities: [] });
  });

  it('passes the dashboard response through without validating activity subjects', () => {
    const next = vi.fn();
    service.getDashboard({ projectId: null, period: '30d', from: null, to: null }).subscribe(next);
    const request = http.expectOne((req) => req.url === `${projectApiUrl}/dashboard`);
    const response = { activities: [{ entry: { id: 'entry-1' } }] };
    request.flush(response);

    expect(next).toHaveBeenCalledWith(response);
  });
});
