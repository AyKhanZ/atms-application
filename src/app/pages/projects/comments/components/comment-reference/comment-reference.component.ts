import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { workItemKinds } from '../../../../../shared/components/work-item-ref/work-item-kinds';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemStatusBadgeComponent } from '../../../../../shared/components/work-item-status-badge/work-item-status-badge.component';
import { CommentReferenceView } from '../../comment-view';

/**
 * A `#41` inside a comment, as in Azure DevOps: a strip in the kind's colour, the code, the title
 * and the status after a rule. Only the title gives way on a narrow screen — the code and the
 * status keep their size, so they never run into it.
 */
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
