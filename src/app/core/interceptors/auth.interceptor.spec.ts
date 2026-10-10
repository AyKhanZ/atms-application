import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, throwError, TimeoutError } from 'rxjs';
import { AccessModel } from '../models/auth/auth.models';
import { AuthSessionService } from '../services/auth-session.service';
import { SnackBarService } from '../services/snack-bar.service';
import { translocoTestingProviders } from '../testing/transloco-testing';
import { authInterceptor } from './auth.interceptor';

let rateLimitClock = 0;

function pastRateLimitGap(): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  rateLimitClock += 5_000;
  vi.setSystemTime(rateLimitClock);
}

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
  let navigate: ReturnType<typeof vi.fn>;
  let snackBar: { warn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      accessModel: vi.fn(() => accessModel),
      refreshAccessToken: vi.fn(),
      logout: vi.fn(),
    };
    navigate = vi.fn();
    snackBar = { warn: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        { provide: AuthSessionService, useValue: auth },
        { provide: Router, useValue: { url: '/dashboard', navigate } },
        { provide: SnackBarService, useValue: snackBar },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
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

  const limited = new HttpErrorResponse({
    status: 429,
    error: { error: 'Too many requests. Try again in 12 s.' },
  });

  it('does not treat a rate limit as the server being down or a stale token', async () => {
    pastRateLimitGap();

    await expect(runRequest('/api/v1/protected', limited)).rejects.toBe(limited);

    expect(navigate).not.toHaveBeenCalled();
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    expect(snackBar.warn).toHaveBeenCalledOnce();
    expect(snackBar.warn).toHaveBeenCalledWith('Too many requests. Try again in 12 s.');
  });

  it('warns once when the limit is hit twice in a row', async () => {
    pastRateLimitGap();

    await expect(runRequest('/api/v1/protected', limited)).rejects.toBe(limited);
    await expect(runRequest('/api/v1/tasks', limited)).rejects.toBe(limited);

    expect(snackBar.warn).toHaveBeenCalledOnce();
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('leaves the login form to say that the limit was hit', async () => {
    pastRateLimitGap();

    await expect(runRequest('/api/v1/auth/login', limited)).rejects.toBe(limited);

    expect(snackBar.warn).not.toHaveBeenCalled();
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  function runProtectedRequest(): Promise<unknown> {
    return runRequest('/api/v1/protected', new HttpErrorResponse({ status: 401 }));
  }

  function runRequest(url: string, error: unknown): Promise<unknown> {
    const request = new HttpRequest('GET', url);
    const next = vi.fn(() => throwError(() => error));

    const response = TestBed.runInInjectionContext(() => authInterceptor(request, next));
    return firstValueFrom(response);
  }
});
