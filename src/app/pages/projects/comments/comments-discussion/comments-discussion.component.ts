import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { WorkProjectParticipantModel } from '../../../../core/models/work-projects';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadMoreButtonComponent } from '../../../../shared/components/load-more-button/load-more-button.component';
import { ProfileAvatarComponent } from '../../../../shared/components/profile-avatar/profile-avatar.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import {
  CommentsStoreActions,
  CommentsStoreSelectors,
  commentsKey,
} from '../../../../store/comments';
import { CommentListState } from '../../../../store/comments/comments.state';
import { UserStoreSelectors } from '../../../../store/user';
import { commentAnchor } from '../../../../core/utils/comment-anchor.utils';
import { CommentActionsService } from '../comment-actions.service';
import { MentionCandidate } from '../comment-suggestion';
import { CommentCardComponent } from '../components/comment-card/comment-card.component';
import { CommentEditorComponent } from '../components/comment-editor/comment-editor.component';

/**
 * The Discussion under a task's description, as in Azure DevOps (13-comments): the field on top,
 * the newest comments under it, 20 at a time. It watches the task while shown, so comments of others
 * appear without a reload, and scrolls to a comment a link points at.
 */
@Component({
  selector: 'app-comments-discussion',
  imports: [
    ButtonModule,
    CommentCardComponent,
    CommentEditorComponent,
    ConfirmDialogComponent,
    LoadMoreButtonComponent,
    PersonInitialsPipe,
    PersonNamePipe,
    ProfileAvatarComponent,
    SkeletonModule,
  ],
  providers: [CommentActionsService, ConfirmationService],
  templateUrl: './comments-discussion.component.html',
  styleUrl: './comments-discussion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsDiscussionComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly realtime = inject(RealtimeService);
  private readonly injector = inject(Injector);
  protected readonly actions = inject(CommentActionsService);

  readonly projectId = input.required<string>();
  readonly workTaskId = input.required<string>();
  /** Comment edit — every project role has it; only someone outside the project reads without it. */
  readonly canWrite = input(false);
  readonly participants = input<readonly WorkProjectParticipantModel[]>([]);

  private readonly newComment = viewChild<CommentEditorComponent>('newComment');

  protected readonly skeletonRows = [0, 1, 2];
  protected readonly me = this.store.selectSignal(UserStoreSelectors.getMe);
  readonly key = computed(() => commentsKey(this.workTaskId()));
  private readonly lists = this.store.selectSignal(CommentsStoreSelectors.getLists);
  readonly list = computed<CommentListState | undefined>(() => this.lists()[this.key()]);
  readonly comments = computed(() => this.list()?.items ?? []);
  /** A linked comment no page read so far holds, shown above the list. */
  readonly linkedComment = computed(() => this.list()?.linked ?? null);
  readonly linkedError = computed(() => this.list()?.linkedError ?? null);
  readonly loading = computed(() => {
    const list = this.list();
    return !list || (list.loading && !list.items.length);
  });
  readonly error = computed(
    () => !!this.list()?.error && !this.comments().length && !this.linkedComment(),
  );
  /** Mentions store the user's id, not the participant row's. */
  readonly people = computed<MentionCandidate[]>(() =>
    this.participants().map((participant) => ({
      id: participant.userId,
      name: participant.name,
      surname: participant.surname,
      avatarPath: participant.avatarPath,
    })),
  );

  private readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });
  /** The comment a link points at, while it is marked. */
  readonly targetId = signal<string | null>(null);
  /** The link already followed: a later change to the list must not scroll back to it. */
  private targetDone: string | null = null;
  private opened: { key: string; workTaskId: string } | null = null;

  constructor() {
    effect(() => {
      const key = this.key();
      const projectId = this.projectId();
      const workTaskId = this.workTaskId();
      untracked(() => {
        if (this.opened?.key === key) return;
        this.close();
        this.targetDone = null;
        this.opened = { key, workTaskId };
        this.actions.setScope({ listKey: key, projectId, workTaskId });
        void this.realtime.watchTask(projectId, workTaskId);
        // Folded and opened again: the list stayed in the store, kept live by the page's watch.
        const kept = this.lists()[key];
        if (!kept || kept.error) this.load();
      });
    });

    effect(() => {
      const fragment = this.fragment();
      const list = this.list();
      untracked(() => this.findTarget(fragment, list));
    });
  }

  ngOnDestroy(): void {
    this.close();
  }

  load(): void {
    this.store.dispatch(
      CommentsStoreActions.load({
        listKey: this.key(),
        projectId: this.projectId(),
        workTaskId: this.workTaskId(),
      }),
    );
  }

  loadMore(): void {
    const cursor = this.list()?.nextCursor;
    if (!cursor) return;
    this.store.dispatch(
      CommentsStoreActions.loadMore({
        listKey: this.key(),
        projectId: this.projectId(),
        workTaskId: this.workTaskId(),
        cursor,
      }),
    );
  }

  send(text: string): void {
    this.actions.send(text, () => this.newComment()?.reset());
  }

  /**
   * A link to a comment: scroll to it once it is on screen. One no page read so far holds is read
   * alone and shown above the list, instead of paging back to it — once, even when it is not found.
   */
  private findTarget(fragment: string | null, list: CommentListState | undefined): void {
    const id = fragment?.startsWith('comment-') ? fragment.slice('comment-'.length) : null;
    if (!list) return;
    if (!id) {
      this.targetDone = null;
      if (list.linkedId) this.store.dispatch(CommentsStoreActions.clearLinked({ listKey: this.key() }));
      return;
    }
    if (id === this.targetDone || list.loading) return;

    if (list.linked?.id === id || list.items.some((item) => item.id === id)) {
      this.targetDone = id;
      this.showTarget(id);
    } else if (list.linkedId !== id) {
      this.store.dispatch(
        CommentsStoreActions.loadLinked({
          listKey: this.key(),
          projectId: this.projectId(),
          workTaskId: this.workTaskId(),
          commentId: id,
        }),
      );
    }
  }

  private showTarget(id: string): void {
    this.targetId.set(id);
    afterNextRender(
      () => {
        document
          .getElementById(commentAnchor(id))
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          if (this.targetId() === id) this.targetId.set(null);
        }, 2500);
      },
      { injector: this.injector },
    );
  }

  /** The list itself stays: the task page drops it when it leaves the task (TaskCommentsService). */
  private close(): void {
    if (!this.opened) return;
    void this.realtime.unwatchTask(this.opened.workTaskId);
    this.opened = null;
  }
}
