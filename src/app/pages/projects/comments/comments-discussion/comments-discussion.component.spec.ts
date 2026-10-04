import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { CommentModel } from '../../../../core/models/comments';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { CommentsStoreActions } from '../../../../store/comments';
import { CommentListState } from '../../../../store/comments/comments.state';
import { initialUserState } from '../../../../store/user/user.state';
import { CommentActionsService } from '../comment-actions.service';
import { CommentsDiscussionComponent } from './comments-discussion.component';

describe('CommentsDiscussionComponent', () => {
  const fragment = new BehaviorSubject<string | null>('comment-old');
  const linked: CommentModel = {
    id: 'old',
    text: 'Old comment',
    createdAt: '2026-01-01T00:00:00Z',
    createdBy: { id: 'u', name: 'Leyla', surname: 'Mammadova', avatarPath: null },
    updatedAt: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    canEdit: false,
    canDelete: false,
    mentions: [],
    references: [],
  };
  let store: MockStore;

  /** The newest page holds only "new"; the link points further back. */
  const withList = (change: Partial<CommentListState> = {}) =>
    store.setState({
      comments: {
        lists: {
          'task:t': {
            projectId: 'p',
            workTaskId: 't',
            items: [{ ...linked, id: 'new' }],
            nextCursor: 'older',
            hasMore: true,
            loading: false,
            loadingMore: false,
            error: null,
            loadMoreError: null,
            removedIds: [],
            linked: null,
            linkedId: null,
            linkedError: null,
            ...change,
          },
        },
      },
      user: initialUserState,
    });

  const render = () => {
    const fixture = TestBed.createComponent(CommentsDiscussionComponent);
    fixture.componentRef.setInput('projectId', 'p');
    fixture.componentRef.setInput('workTaskId', 't');
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    fragment.next('comment-old');
    await TestBed.configureTestingModule({
      imports: [CommentsDiscussionComponent],
      providers: [
        provideMockStore(),
        { provide: ActivatedRoute, useValue: { fragment } },
        {
          provide: RealtimeService,
          useValue: {
            watchTask: vi.fn(() => Promise.resolve()),
            unwatchTask: vi.fn(() => Promise.resolve()),
          },
        },
      ],
    })
      .overrideComponent(CommentsDiscussionComponent, {
        set: {
          template: '',
          providers: [{ provide: CommentActionsService, useValue: { setScope: vi.fn() } }],
        },
      })
      .compileComponents();
    store = TestBed.inject(MockStore);
    withList();
    vi.spyOn(store, 'dispatch');
  });

  it('asks the store for a linked comment no page holds, instead of paging back to it', () => {
    render();

    expect(store.dispatch).toHaveBeenCalledWith(
      CommentsStoreActions.loadLinked({
        listKey: 'task:t',
        projectId: 'p',
        workTaskId: 't',
        commentId: 'old',
      }),
    );
    expect(store.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: CommentsStoreActions.loadMore.type }),
    );
  });

  it('shows the linked comment the store read, above the list', () => {
    const fixture = render();
    withList({ linkedId: 'old', linked });
    fixture.detectChanges();

    expect(fixture.componentInstance.linkedComment()).toEqual(linked);
    expect(fixture.componentInstance.targetId()).toBe('old');
  });

  it('asks once: a comment not found is reported, not read again', () => {
    withList({ linkedId: 'old', linkedError: "The linked comment couldn't be found." });
    const fixture = render();

    expect(store.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: CommentsStoreActions.loadLinked.type }),
    );
    expect(fixture.componentInstance.linkedError()).toBe("The linked comment couldn't be found.");
  });

  it('reads nothing for a link to a comment already on the page', () => {
    fragment.next('comment-new');
    const fixture = render();

    expect(store.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: CommentsStoreActions.loadLinked.type }),
    );
    expect(fixture.componentInstance.targetId()).toBe('new');
  });

  it('drops the linked comment when the link leaves the address', () => {
    withList({ linkedId: 'old', linked });
    const fixture = render();

    fragment.next(null);
    fixture.detectChanges();

    expect(store.dispatch).toHaveBeenCalledWith(
      CommentsStoreActions.clearLinked({ listKey: 'task:t' }),
    );
  });
});
