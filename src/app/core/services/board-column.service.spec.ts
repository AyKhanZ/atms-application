import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { projectApiUrl } from '../constants/api-url.constants';
import { BoardColumnService } from './board-column.service';

describe('BoardColumnService', () => {
  let service: BoardColumnService;
  let http: HttpTestingController;
  const url = `${projectApiUrl}/board-columns`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BoardColumnService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the columns in order', () => {
    service.getAll().subscribe();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
