import { inject, Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  IRetryPolicy,
  LogLevel,
} from '@microsoft/signalr';
import { firstValueFrom, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { REALTIME_EVENT_NAMES, REALTIME_HUB_PATH } from '../constants/realtime.constants';
import { CommentChangedEvent } from '../models/realtime/comment-changed.event';
import { NotificationCreatedEvent } from '../models/realtime/notification-created.event';
import { NotificationReadEvent } from '../models/realtime/notification-read.event';
import { WorkItemChangedEvent } from '../models/realtime/work-item-changed.event';
import { shouldRefreshAccessToken } from '../utils/access-token-expiry.utils';
import { isTerminalRefreshError } from '../utils/http-error.utils';
import { AuthSessionService, RefreshTokenMissingError } from './auth-session.service';

const START_RETRY_DELAY_MS = 30_000;
const RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 30_000] as const;

export const REALTIME_RETRY_POLICY: IRetryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
    RECONNECT_DELAYS_MS[Math.min(previousRetryCount, RECONNECT_DELAYS_MS.length - 1)],
};

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthSessionService);
  private readonly notificationCreatedSubject = new Subject<NotificationCreatedEvent>();
  private readonly notificationReadSubject = new Subject<NotificationReadEvent>();
  private readonly commentChangedSubject = new Subject<CommentChangedEvent>();
  private readonly workItemChangedSubject = new Subject<WorkItemChangedEvent>();
  private readonly reconnectedSubject = new Subject<void>();
  private readonly projectSubscriptions = new Map<string, number>();
  private readonly taskSubscriptions = new Map<string, { projectId: string; count: number }>();
  private connection: HubConnection | null = null;
  private startRequest: Promise<void> | null = null;
  private startRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private startFailed = false;

  readonly notificationCreated$ = this.notificationCreatedSubject.asObservable();
  readonly notificationRead$ = this.notificationReadSubject.asObservable();
  readonly commentChanged$ = this.commentChangedSubject.asObservable();
  readonly workItemChanged$ = this.workItemChangedSubject.asObservable();
  readonly reconnected$ = this.reconnectedSubject.asObservable();

  start(): Promise<void> {
    this.active = true;
    this.connection ??= this.createConnection();

    if (this.connection.state !== HubConnectionState.Disconnected || this.startRetryTimer) {
      return this.startRequest ?? Promise.resolve();
    }

    if (this.startRequest) return this.startRequest;

    const connection = this.connection;
    const request = connection
      .start()
      .then(() => {
        if (!this.active || this.connection !== connection) return;
        const recovered = this.startFailed;
        this.startFailed = false;
        return this.restoreGroups(connection, recovered);
      })
      .catch(() => {
        if (this.active && this.connection === connection) {
          this.startFailed = true;
          this.startRetryTimer = setTimeout(() => {
            this.startRetryTimer = null;
            void this.start();
          }, START_RETRY_DELAY_MS);
        }
      })
      .finally(() => {
        if (this.startRequest === request) this.startRequest = null;
      });

    this.startRequest = request;
    return request;
  }

  async stop(): Promise<void> {
    this.active = false;
    this.startFailed = false;
    this.projectSubscriptions.clear();
    this.taskSubscriptions.clear();

    if (this.startRetryTimer) {
      clearTimeout(this.startRetryTimer);
      this.startRetryTimer = null;
    }

    const connection = this.connection;
    this.connection = null;
    this.startRequest = null;
    if (connection) await connection.stop();
  }

  joinProject(projectId: string): Promise<void> {
    const count = this.projectSubscriptions.get(projectId) ?? 0;
    this.projectSubscriptions.set(projectId, count + 1);
    if (count > 0) return Promise.resolve();

    return this.invokeIfConnected('JoinProject', projectId);
  }

  leaveProject(projectId: string): Promise<void> {
    const count = this.projectSubscriptions.get(projectId);
    if (count === undefined) return Promise.resolve();
    if (count > 1) {
      this.projectSubscriptions.set(projectId, count - 1);
      return Promise.resolve();
    }

    this.projectSubscriptions.delete(projectId);
    return this.invokeIfConnected('LeaveProject', projectId);
  }

  watchTask(projectId: string, taskId: string): Promise<void> {
    const subscription = this.taskSubscriptions.get(taskId);
    if (subscription) {
      subscription.count++;
      return Promise.resolve();
    }

    this.taskSubscriptions.set(taskId, { projectId, count: 1 });
    return this.invokeIfConnected('WatchTask', projectId, taskId);
  }

  unwatchTask(taskId: string): Promise<void> {
    const subscription = this.taskSubscriptions.get(taskId);
    if (!subscription) return Promise.resolve();
    if (subscription.count > 1) {
      subscription.count--;
      return Promise.resolve();
    }

    this.taskSubscriptions.delete(taskId);
    return this.invokeIfConnected('UnwatchTask', taskId);
  }

  private createConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}${REALTIME_HUB_PATH}`, {
        accessTokenFactory: () => this.getAccessToken(),
        withCredentials: false,
      })
      .withAutomaticReconnect(REALTIME_RETRY_POLICY)
      .configureLogging(LogLevel.None)
      .build();

    connection.on(REALTIME_EVENT_NAMES.notificationCreated, (event: NotificationCreatedEvent) =>
      this.notificationCreatedSubject.next(event),
    );
    connection.on(REALTIME_EVENT_NAMES.notificationRead, (event: NotificationReadEvent) =>
      this.notificationReadSubject.next(event),
    );
    connection.on(REALTIME_EVENT_NAMES.commentChanged, (event: CommentChangedEvent) =>
      this.commentChangedSubject.next(event),
    );
    connection.on(REALTIME_EVENT_NAMES.workItemChanged, (event: WorkItemChangedEvent) =>
      this.workItemChangedSubject.next(event),
    );
    connection.onreconnected(() => {
      void this.restoreGroups(connection, true);
    });

    return connection;
  }

  private async getAccessToken(): Promise<string> {
    const accessModel = this.auth.accessModel();
    if (!accessModel) return '';

    if (!shouldRefreshAccessToken(accessModel.accessTokenExpireTime)) {
      return accessModel.accessToken;
    }

    try {
      return (await firstValueFrom(this.auth.refreshAccessToken())).accessToken;
    } catch (error) {
      if (isTerminalRefreshError(error) || error instanceof RefreshTokenMissingError) {
        this.auth.logout();
      }
      throw error;
    }
  }

  private async restoreGroups(
    connection: HubConnection,
    notifyReconnected: boolean,
  ): Promise<void> {
    for (const projectId of this.projectSubscriptions.keys()) {
      if (!this.active || this.connection !== connection) return;
      try {
        await connection.invoke('JoinProject', projectId);
      } catch {
        // A failed join must not prevent other groups or the screen from refreshing.
      }
    }

    for (const [taskId, { projectId }] of this.taskSubscriptions) {
      if (!this.active || this.connection !== connection) return;
      try {
        await connection.invoke('WatchTask', projectId, taskId);
      } catch {
        // Continue restoring the remaining subscriptions before notifying the screen.
      }
    }

    if (notifyReconnected && this.active && this.connection === connection) {
      this.reconnectedSubject.next();
    }
  }

  private invokeIfConnected(method: string, ...args: string[]): Promise<void> {
    if (!this.active || this.connection?.state !== HubConnectionState.Connected) {
      return Promise.resolve();
    }

    return this.connection.invoke(method, ...args);
  }
}
