import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { CommentModel } from '../../../../../core/models/comments';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { HistoryTimePipe } from '../../../../../shared/pipes/history.pipe';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { commentAnchor } from '../../../../../core/utils/comment-anchor.utils';
import { CommentActionsService } from '../../comment-actions.service';
import { MentionCandidate } from '../../comment-suggestion';
import { CommentEditorComponent } from '../comment-editor/comment-editor.component';
import { CommentTextComponent } from '../comment-text/comment-text.component';

/**
 * One comment as a card, as in Azure DevOps: who and when, the text, and its actions shown on hover —
 * copy link and edit at hand, delete behind ⋯ — instead of buttons that shout from every card.
 */
@Component({
  selector: 'app-comment-card',
  imports: [
    CommentEditorComponent,
    CommentTextComponent,
    HistoryTimePipe,
    MenuModule,
    PersonInitialsPipe,
    PersonNamePipe,
    ProfileAvatarComponent,
    RouterLink,
  ],
  templateUrl: './comment-card.component.html',
  styleUrl: './comment-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentCardComponent {
  protected readonly actions = inject(CommentActionsService);

  readonly comment = input.required<CommentModel>();
  readonly people = input<readonly MentionCandidate[]>([]);
  /** The task's project: work from it is listed under `#` without the project's name. */
  readonly projectId = input<string | null>(null);
  /** Opened from a link to this comment: marked for a moment so the eye finds it. */
  readonly target = input(false);

  /** Taller than this, a comment is folded to {@link FOLDED_HEIGHT} with "Show more". */
  readonly long = signal(false);
  readonly unfolded = signal(false);
  private readonly text = viewChild('text', { read: ElementRef<HTMLElement> });

  readonly anchor = computed(() => commentAnchor(this.comment().id));
  readonly editing = computed(() => this.actions.editingId() === this.comment().id);
  /** Everyone the text may mention: the members, and whoever it mentions already. */
  readonly mentionable = computed<readonly MentionCandidate[]>(() => [
    ...this.people(),
    ...this.comment().mentions,
  ]);
  /** Behind ⋯, as in Azure DevOps: only Delete, the one action worth a second step. */
  readonly menuItems = computed<MenuItem[]>(() => {
    const comment = this.comment();
    return [
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: 'work-groups-menu-danger',
        command: () => this.actions.confirmDelete(comment),
      },
    ];
  });
  /** On a phone, where there is no hover and no room: every action in one menu. */
  readonly compactMenuItems = computed<MenuItem[]>(() => {
    const comment = this.comment();
    return [
      {
        label: 'Copy link',
        icon: 'pi pi-link',
        command: () => this.actions.copyLink(comment.id),
      },
      ...(comment.canEdit
        ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => this.actions.startEdit(comment) }]
        : []),
      ...(comment.canDelete ? this.menuItems() : []),
    ];
  });

  /** What the one menu of the card holds this time: Delete alone, or every action on a phone. */
  readonly menuModel = signal<MenuItem[]>([]);

  protected openMenu(menu: Menu, event: Event, items: MenuItem[]): void {
    this.menuModel.set(items);
    menu.toggle(event);
  }

  constructor() {
    // The text is measured whole, past the fold: its own height says whether it is long. A link
    // to the comment opens it unfolded — the reader came for all of it.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
    effect(() => {
      if (this.target()) this.unfolded.set(true);
    });
    afterRenderEffect(() => {
      const element = this.text()?.nativeElement;
      observer?.disconnect();
      if (!element) return;
      observer?.observe(element);
      this.measure();
    });
  }

  private measure(): void {
    const element = this.text()?.nativeElement;
    if (!element) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    // A fold that hides only a line or two costs a click for nothing: fold from a third more.
    this.long.set(element.offsetHeight > FOLDED_HEIGHT * rem * 1.35);
  }
}

/** The height of a folded comment, in rem; the stylesheet folds it to the same. */
const FOLDED_HEIGHT = 18;
