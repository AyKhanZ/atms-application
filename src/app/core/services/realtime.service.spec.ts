import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { HubConnectionState, IRetryPolicy, RetryContext } from '@microsoft/signalr';
import { of, throwError } from 'rxjs';
import { AuthSessionService, RefreshTokenMissingError } from './auth-session.service';
import { REALTIME_RETRY_POLICY, RealtimeService } from './realtime.service';

const fake = vi.hoisted(() => ({
  connection: {
    state: 'Disconnected' as HubConnectionState,
    start: vi.fn(),
    stop: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    onreconnected: vi.fn(),
  },
  url: '',
  options: { accessTokenFactory: () => '', withCredentials: true },
  retryPolicy: null as IRetryPolicy | null,
}));

vi.mock('@microsoft/signalr', () => {
  return {
    HubConnectionState: { Disconnected: 'Disconnected', Connected: 'Connected' },
    LogLevel: { None: 6 },
    HubConnectionBuilder: class {
      withUrl(url: string, options: typeof fake.options) {
        fake.url = url;
        fake.options = options;
        return this;
      }

      withAutomaticReconnect(policy: IRetryPolicy) {
        fake.retryPolicy = policy;
        return this;
      }
      configureLogging() {
        return this;
      }
      build() {
        return fake.connection;
      }
    },
  };
});

describe('RealtimeService', () => {
  let service: RealtimeService;
  let accessToken: string;
  let expiresAt: string;
  let refreshAccessToken: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    accessToken = 'first-token';
    expiresAt = new Date(Date.now() + 120_000).toISOString();
    refreshAccessToken = vi.fn();
    logout = vi.fn();
    fake.connection.state = HubConnectionState.Disconnected;
    fake.connection.start.mockReset().mockImplementation(async () => {
      fake.connection.state = HubConnectionState.Connected;
    });
    fake.connection.stop.mockReset().mockImplementation(async () => {
      fake.connection.state = HubConnectionState.Disconnected;
    });
    fake.connection.invoke.mockReset().mockResolvedValue(undefined);
    fake.connection.on.mockReset();
    fake.connection.onreconnected.mockReset();

    TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        {
          provide: AuthSessionService,
          useValue: {
            accessModel: () => ({ accessToken, accessTokenExpireTime: expiresAt }),
            refreshAccessToken,
            logout,
          },
        },
      ],
    });
    service = TestBed.inject(RealtimeService);
  });

  afterEach(async () => {
    await service.stop();
    vi.useRealTimers();
  });

  it.each([0, 1, 2, 3, 4, 5, 20])('uses the specified retry delay at attempt %i', (attempt) => {
    const expected = [0, 2_000, 5_000, 10_000, 30_000][Math.min(attempt, 4)];
    const context: RetryContext = {
      previousRetryCount: attempt,
      elapsedMilliseconds: 0,
      retryReason: new Error(),
    };

    expect(REALTIME_RETRY_POLICY.nextRetryDelayInMilliseconds(context)).toBe(expected);
  });

  it('uses the current session token without credentials', async () => {
    await service.start();

    expect(fake.url).toBe('http://localhost:5000/project/hubs/realtime');
    expect(fake.options.withCredentials).toBe(false);
    expect(fake.retryPolicy).toBe(REALTIME_RETRY_POLICY);
    expect(await fake.options.accessTokenFactory()).toBe('first-token');
    accessToken = 'refreshed-token';
    expect(await fake.options.accessTokenFactory()).toBe('refreshed-token');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes an expired token before returning it to SignalR', async () => {
    expiresAt = new Date(Date.now() - 1_000).toISOString();
    refreshAccessToken.mockReturnValue(of({ accessToken: 'new-token' }));
    await service.start();

    expect(await fake.options.accessTokenFactory()).toBe('new-token');
    expect(refreshAccessToken).toHaveBeenCalledOnce();
  });

  it('refreshes a token expiring within one minute', async () => {
    expiresAt = new Date(Date.now() + 30_000).toISOString();
    refreshAccessToken.mockReturnValue(of({ accessToken: 'new-token' }));
    await service.start();

    expect(await fake.options.accessTokenFactory()).toBe('new-token');
  });

  it.each([
    new HttpErrorResponse({ status: 401 }),
    new HttpErrorResponse({ status: 403 }),
    new RefreshTokenMissingError(),
  ])('ends the session on a terminal refresh error: %s', async (error) => {
    expiresAt = new Date(Date.now() - 1_000).toISOString();
    refreshAccessToken.mockReturnValue(throwError(() => error));
    await service.start();

    await expect(fake.options.accessTokenFactory()).rejects.toBe(error);
    expect(logout).toHaveBeenCalledOnce();
  });

  it.each([0, 503, 504])(
    'preserves the session when refresh fails with status %i',
    async (status) => {
      expiresAt = new Date(Date.now() - 1_000).toISOString();
      const error = new HttpErrorResponse({ status });
      refreshAccessToken.mockReturnValue(throwError(() => error));
      await service.start();

      await expect(fake.options.accessTokenFactory()).rejects.toBe(error);
      expect(logout).not.toHaveBeenCalled();
    },
  );

  it('retries a failed first start after 30 seconds and cancels on logout', async () => {
    vi.useFakeTimers();
    fake.connection.start.mockRejectedValue(new Error('offline'));

    await service.start();
    expect(fake.connection.start).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fake.connection.start).toHaveBeenCalledTimes(2);

    await service.stop();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fake.connection.start).toHaveBeenCalledTimes(2);
  });

  it('connects when a repeated first start succeeds', async () => {
    vi.useFakeTimers();
    fake.connection.start.mockRejectedValueOnce(new Error('offline'));

    await service.start();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fake.connection.start).toHaveBeenCalledTimes(2);
    expect(fake.connection.state).toBe(HubConnectionState.Connected);
  });

  it('emits reconnected after a failed first start recovers and attempts all groups', async () => {
    vi.useFakeTimers();
    const received = vi.fn();
    const subscription = service.reconnected$.subscribe(received);
    await service.joinProject('project-1');
    await service.watchTask('project-1', 'task-1');
    fake.connection.start.mockRejectedValueOnce(new Error('offline'));

    await service.start();
    expect(received).not.toHaveBeenCalled();
    fake.connection.invoke.mockRejectedValueOnce(new Error('join failed'));
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fake.connection.invoke).toHaveBeenCalledWith('WatchTask', 'project-1', 'task-1');
    expect(received).toHaveBeenCalledOnce();
    subscription.unsubscribe();
  });

  it('does not emit reconnected for an immediately successful first start', async () => {
    const received = vi.fn();
    const subscription = service.reconnected$.subscribe(received);

    await service.start();

    expect(received).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('forgets failed starts when the session stops', async () => {
    vi.useFakeTimers();
    const received = vi.fn();
    const subscription = service.reconnected$.subscribe(received);
    fake.connection.start.mockRejectedValueOnce(new Error('offline'));

    await service.start();
    await service.stop();
    await service.start();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(fake.connection.start).toHaveBeenCalledTimes(2);
    expect(received).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('restores requested project and task groups after reconnect', async () => {
    await service.joinProject('project-1');
    await service.watchTask('project-1', 'task-1');
    await service.start();
    expect(fake.connection.invoke).toHaveBeenCalledWith('JoinProject', 'project-1');
    expect(fake.connection.invoke).toHaveBeenCalledWith('WatchTask', 'project-1', 'task-1');

    fake.connection.invoke.mockClear();
    const onReconnected = fake.connection.onreconnected.mock.calls[0][0];
    onReconnected();
    await vi.waitFor(() => expect(fake.connection.invoke).toHaveBeenCalledTimes(2));

    await service.leaveProject('project-1');
    await service.unwatchTask('task-1');
    fake.connection.invoke.mockClear();
    onReconnected();
    await Promise.resolve();
    expect(fake.connection.invoke).not.toHaveBeenCalled();
  });

  it('keeps project and task memberships until the last caller leaves', async () => {
    await service.start();
    await service.joinProject('project-1');
    await service.joinProject('project-1');
    await service.watchTask('project-1', 'task-1');
    await service.watchTask('project-1', 'task-1');

    expect(fake.connection.invoke).toHaveBeenCalledTimes(2);
    expect(fake.connection.invoke).toHaveBeenCalledWith('JoinProject', 'project-1');
    expect(fake.connection.invoke).toHaveBeenCalledWith('WatchTask', 'project-1', 'task-1');

    await service.leaveProject('project-1');
    await service.unwatchTask('task-1');
    expect(fake.connection.invoke).toHaveBeenCalledTimes(2);

    await service.leaveProject('project-1');
    await service.unwatchTask('task-1');
    expect(fake.connection.invoke).toHaveBeenCalledTimes(4);
    expect(fake.connection.invoke).toHaveBeenCalledWith('LeaveProject', 'project-1');
    expect(fake.connection.invoke).toHaveBeenCalledWith('UnwatchTask', 'task-1');
  });

  it('emits reconnected only after requested groups have been restored', async () => {
    await service.start();
    await service.joinProject('project-1');
    const received = vi.fn();
    const subscription = service.reconnected$.subscribe(received);
    let completeJoin: (() => void) | undefined;
    fake.connection.invoke.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          completeJoin = resolve;
        }),
    );

    fake.connection.onreconnected.mock.calls[0][0]();
    expect(received).not.toHaveBeenCalled();
    completeJoin?.();
    await vi.waitFor(() => expect(received).toHaveBeenCalledOnce());
    subscription.unsubscribe();
  });

  it('emits reconnected after attempting all groups even when a join fails', async () => {
    await service.start();
    await service.joinProject('project-1');
    await service.watchTask('project-1', 'task-1');
    const received = vi.fn();
    const subscription = service.reconnected$.subscribe(received);
    fake.connection.invoke.mockClear().mockRejectedValueOnce(new Error('join failed'));

    fake.connection.onreconnected.mock.calls[0][0]();

    await vi.waitFor(() => expect(received).toHaveBeenCalledOnce());
    expect(fake.connection.invoke).toHaveBeenCalledTimes(2);
    expect(fake.connection.invoke).toHaveBeenLastCalledWith('WatchTask', 'project-1', 'task-1');
    subscription.unsubscribe();
  });

  it('emits typed work item events', async () => {
    const received = vi.fn();
    const subscription = service.workItemChanged$.subscribe(received);
    await service.start();
    const handler = fake.connection.on.mock.calls.find(
      ([name]) => name === 'workItem.changed',
    )?.[1];
    const event = { projectId: 'project-1', entityType: 'task', id: 'task-1', action: 'updated' };

    handler(event);
    expect(received).toHaveBeenCalledWith(event);
    subscription.unsubscribe();
  });
});
