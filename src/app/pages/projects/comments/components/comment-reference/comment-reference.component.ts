import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { workItemKinds } from '../../../../../shared/components/work-item-ref/work-item-kinds';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemStatusBadgeComponent } from '../../../../../shared/components/work-item-status-badge/work-item-status-badge.component';
import { CommentReferenceView } from '../../comment-view';

// only the title shrinks on a narrow screen, code and status keep their size
@Component({
  selector: 'app-comment-reference',
  imports: [RouterLink, WorkItemRefComponent, WorkItemStatusBadgeComponent],
  templateUrl: './comment-reference.component.html',
  styleUrl: './comment-reference.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentReferenceComponent {
  readonly view = input.required<CommentReferenceView>();

  readonly tone = computed(() => workItemKinds[this.view().kind].tone);
}
