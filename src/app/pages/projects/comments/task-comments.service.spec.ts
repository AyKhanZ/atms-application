import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { Subject, of } from 'rxjs';
import { CommentChangedEvent } from '../../../core/models/realtime/comment-changed.event';
import { RealtimeService } from '../../../core/services/realtime.service';
import { WorkTasksService } from '../../../core/services/work-tasks.service';
import { CommentsStoreActions } from '../../../store/comments';
import { TaskCommentsService, commentsCountAfter } from './task-comments.service';

describe('TaskCommentsService', () => {
  const task = (id: string, commentsCount: number) => ({ id, workProjectId: 'p', commentsCount });
  const event = (
    workTaskId: string,
    action: CommentChangedEvent['action'],
  ): CommentChangedEvent => ({
    workTaskId,
    commentId: 'c',
    action,
  });

  let changes: Subject<CommentChangedEvent>;
  let reconnected: Subject<void>;
  let realtime: {
    commentChanged$: Subject<CommentChangedEvent>;
    reconnected$: Subject<void>;
    watchTask: ReturnType<typeof vi.fn>;
    unwatchTask: ReturnType<typeof vi.fn>;
  };
  let getWorkTask: ReturnType<typeof vi.fn>;
  let dispatch: ReturnType<typeof vi.fn>;
  let service: TaskCommentsService;

  beforeEach(() => {
    changes = new Subject();
    reconnected = new Subject();
    realtime = {
      commentChanged$: changes,
      reconnected$: reconnected,
      watchTask: vi.fn(() => Promise.resolve()),
      unwatchTask: vi.fn(() => Promise.resolve()),
    };
    getWorkTask = vi.fn(() => of(task('t', 7)));
    dispatch = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        TaskCommentsService,
        { provide: RealtimeService, useValue: realtime },
        { provide: WorkTasksService, useValue: { getWorkTask } },
        { provide: Store, useValue: { dispatch } },
      ],
    });
    service = TestBed.inject(TaskCommentsService);
  });

  it('counts comments added and deleted on the task on screen only', () => {
    service.watch(task('t', 2));

    changes.next(event('t', 'created'));
    changes.next(event('t', 'updated'));
    changes.next(event('other', 'created'));
    changes.next(event('t', 'deleted'));
    changes.next(event('t', 'deleted'));

    expect(service.count()).toBe(1);
  });

  it('watches the next task instead of the previous one and drops its list on leaving', () => {
    service.watch(task('a', 0));
    service.watch(task('b', 5));
    TestBed.resetTestingModule();

    expect(realtime.watchTask.mock.calls).toEqual([
      ['p', 'a'],
      ['p', 'b'],
    ]);
    expect(realtime.unwatchTask.mock.calls).toEqual([['a'], ['b']]);
    expect(dispatch.mock.calls).toEqual([
      [CommentsStoreActions.clear({ listKey: 'task:a' })],
      [CommentsStoreActions.clear({ listKey: 'task:b' })],
    ]);
  });

  it('reads the number again after the connection comes back', () => {
    service.watch(task('t', 2));

    reconnected.next();

    expect(getWorkTask).toHaveBeenCalledWith('p', 't');
    expect(service.count()).toBe(7);
  });

  it('never goes below zero', () => {
    expect(commentsCountAfter(0, 'deleted')).toBe(0);
  });
});
