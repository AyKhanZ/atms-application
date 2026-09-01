import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { firstValueFrom, of, throwError } from 'rxjs';
import { AccessModel } from '../models/auth/auth.models';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthSessionService', () => {
  const oldAccessModel: AccessModel = {
    accessToken: 'old-access-token',
    refreshToken: 'old-refresh-token',
    accessTokenExpireTime: '2026-08-16T09:00:00Z',
  };
  const newAccessModel: AccessModel = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    accessTokenExpireTime: '2026-08-16T09:10:00Z',
  };

  let api: { refresh: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let tokenStorage: {
    getAccessModel: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  let store: { selectSignal: ReturnType<typeof vi.fn>; dispatch: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let originalLocks: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
    api = { refresh: vi.fn(), logout: vi.fn(() => of(undefined)) };
    tokenStorage = {
      getAccessModel: vi.fn(),
      save: vi.fn(),
      clear: vi.fn(),
    };
    store = {
      selectSignal: vi.fn(() => () => null),
      dispatch: vi.fn(),
    };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthSessionService,
        { provide: AuthService, useValue: api },
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => {
    if (originalLocks) {
      Object.defineProperty(navigator, 'locks', originalLocks);
    } else {
      Reflect.deleteProperty(navigator, 'locks');
    }
  });

  it('reuses tokens refreshed by another tab instead of calling refresh again', async () => {
    tokenStorage.getAccessModel
      .mockReturnValueOnce(oldAccessModel)
      .mockReturnValueOnce(newAccessModel);
    const request = vi.fn((_name: string, callback: () => Promise<AccessModel>) => callback());
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    const service = TestBed.inject(AuthSessionService);
    const result = await firstValueFrom(service.refreshAccessToken());

    expect(request).toHaveBeenCalledWith('atms-auth-refresh', expect.any(Function));
    expect(api.refresh).not.toHaveBeenCalled();
    expect(tokenStorage.save).toHaveBeenCalledWith(newAccessModel);
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ accessModel: newAccessModel }),
    );
    expect(result).toEqual(newAccessModel);
  });

  it('calls the API while holding the cross-tab refresh lock', async () => {
    tokenStorage.getAccessModel.mockReturnValue(oldAccessModel);
    api.refresh.mockReturnValue(of(newAccessModel));
    const request = vi.fn((_name: string, callback: () => Promise<AccessModel>) => callback());
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request },
    });

    const service = TestBed.inject(AuthSessionService);
    const result = await firstValueFrom(service.refreshAccessToken());

    expect(api.refresh).toHaveBeenCalledOnce();
    expect(api.refresh).toHaveBeenCalledWith({ refreshToken: oldAccessModel.refreshToken });
    expect(tokenStorage.save).toHaveBeenCalledWith(newAccessModel);
    expect(result).toEqual(newAccessModel);
  });

  it('clears persisted tokens when startup refresh confirms they are invalid', async () => {
    tokenStorage.getAccessModel.mockReturnValue(oldAccessModel);
    api.refresh.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );

    const service = TestBed.inject(AuthSessionService);
    await service.init();

    expect(tokenStorage.clear).toHaveBeenCalledOnce();
  });

  it('preserves persisted tokens when startup refresh fails temporarily', async () => {
    tokenStorage.getAccessModel.mockReturnValue(oldAccessModel);
    api.refresh.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );

    const service = TestBed.inject(AuthSessionService);
    await service.init();

    expect(tokenStorage.clear).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/server-unavailable']);
  });
});
