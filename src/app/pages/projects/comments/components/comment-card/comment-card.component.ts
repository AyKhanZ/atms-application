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
  // work from this project is listed under # without the project name
  readonly projectId = input<string | null>(null);
  readonly target = input(false);

  readonly long = signal(false);
  readonly unfolded = signal(false);
  private readonly text = viewChild('text', { read: ElementRef<HTMLElement> });

  readonly anchor = computed(() => commentAnchor(this.comment().id));
  readonly editing = computed(() => this.actions.editingId() === this.comment().id);
  // members and whoever the text already mentions
  readonly mentionable = computed<readonly MentionCandidate[]>(() => [
    ...this.people(),
    ...this.comment().mentions,
  ]);
  // only Delete, the one action worth a second step
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

  readonly menuModel = signal<MenuItem[]>([]);

  protected openMenu(menu: Menu, event: Event, items: MenuItem[]): void {
    this.menuModel.set(items);
    menu.toggle(event);
  }

  constructor() {
    // measured whole, past the fold; a link to the comment opens it unfolded
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
    // folding only a line or two costs a click for nothing, fold from a third more
    this.long.set(element.offsetHeight > FOLDED_HEIGHT * rem * 1.35);
  }
}

// same as in the stylesheet
const FOLDED_HEIGHT = 18;
