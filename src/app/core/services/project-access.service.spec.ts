import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { projectApiUrl } from '../constants/api-url.constants';
import { ProjectAccessService } from './project-access.service';

describe('ProjectAccessService', () => {
  let service: ProjectAccessService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00Z'));

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProjectAccessService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('reuses project permissions while the cache entry is valid', async () => {
    const first = firstValueFrom(service.getPermissions('project-1'));
    const second = firstValueFrom(service.getPermissions('project-1'));

    const request = http.expectOne(`${projectApiUrl}/project/project-1/my-permissions`);
    request.flush(['ProjectView']);

    expect(await first).toEqual(['ProjectView']);
    expect(await second).toEqual(['ProjectView']);
    http.expectNone(`${projectApiUrl}/project/project-1/my-permissions`);
  });

  it('reloads project permissions after the cache ttl expires', async () => {
    const first = firstValueFrom(service.getPermissions('project-1'));
    http.expectOne(`${projectApiUrl}/project/project-1/my-permissions`).flush(['ProjectView']);
    expect(await first).toEqual(['ProjectView']);

    vi.advanceTimersByTime(60_001);

    const second = firstValueFrom(service.getPermissions('project-1'));
    http.expectOne(`${projectApiUrl}/project/project-1/my-permissions`).flush(['ProjectEdit']);

    expect(await second).toEqual(['ProjectEdit']);
  });

  it('clears all cached project permissions', async () => {
    const first = firstValueFrom(service.getPermissions('project-1'));
    http.expectOne(`${projectApiUrl}/project/project-1/my-permissions`).flush(['ProjectView']);
    expect(await first).toEqual(['ProjectView']);

    service.clearAll();

    const second = firstValueFrom(service.getPermissions('project-1'));
    http.expectOne(`${projectApiUrl}/project/project-1/my-permissions`).flush(['ProjectEdit']);

    expect(await second).toEqual(['ProjectEdit']);
  });
});
