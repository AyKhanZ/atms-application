import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, throwError, TimeoutError } from 'rxjs';
import { AccessModel } from '../models/auth/auth.models';
import { AuthSessionService } from '../services/auth-session.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const accessModel: AccessModel = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpireTime: '2026-09-01T12:00:00Z',
  };

  let auth: {
    accessModel: ReturnType<typeof vi.fn>;
    refreshAccessToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = {
      accessModel: vi.fn(() => accessModel),
      refreshAccessToken: vi.fn(),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: auth },
        { provide: Router, useValue: { url: '/dashboard', navigate: vi.fn() } },
      ],
    });
  });

  it.each([401, 403])('logs out when refresh returns terminal status %s', async (status) => {
    const refreshError = new HttpErrorResponse({ status });
    auth.refreshAccessToken.mockReturnValue(throwError(() => refreshError));

    await expect(runProtectedRequest()).rejects.toBe(refreshError);

    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it.each([
    new HttpErrorResponse({ status: 0 }),
    new HttpErrorResponse({ status: 500 }),
    new HttpErrorResponse({ status: 503 }),
    new TimeoutError(),
  ])('preserves the session when refresh fails temporarily', async (refreshError) => {
    auth.refreshAccessToken.mockReturnValue(throwError(() => refreshError));

    await expect(runProtectedRequest()).rejects.toBe(refreshError);

    expect(auth.logout).not.toHaveBeenCalled();
  });

  function runProtectedRequest(): Promise<unknown> {
    const request = new HttpRequest('GET', '/api/v1/protected');
    const next = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );

    const response = TestBed.runInInjectionContext(() => authInterceptor(request, next));
    return firstValueFrom(response);
  }
});
