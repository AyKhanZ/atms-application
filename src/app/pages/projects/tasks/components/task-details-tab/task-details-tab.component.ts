import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TaskLocationComponent } from '../task-location/task-location.component';
import { WorkProjectParticipantModel } from '../../../../../core/models/work-projects';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../../core/enums/work-task-status.enum';
import { FoldedSectionsService } from '../../../../../core/services/folded-sections.service';
import { CollapsibleSectionComponent } from '../../../../../shared/components/collapsible-section/collapsible-section.component';
import { WorkItemFactsComponent } from '../../../../../shared/components/work-item-facts/work-item-facts.component';
import { WorkItemFacts } from '../../../../../shared/components/work-item-facts/work-item-facts.model';
import { CommentsDiscussionComponent } from '../../../comments/comments-discussion/comments-discussion.component';

@Component({
  selector: 'app-task-details-tab',
  imports: [
    CollapsibleSectionComponent,
    CommentsDiscussionComponent,
    TaskLocationComponent,
    WorkItemFactsComponent,
  ],
  templateUrl: './task-details-tab.component.html',
  styleUrl: './task-details-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsTabComponent {
  private readonly sections = inject(FoldedSectionsService);

  readonly task = input.required<WorkTaskModel>();
  readonly canComment = input(false);
  readonly participants = input<readonly WorkProjectParticipantModel[]>([]);

  protected readonly descriptionOpen = this.sections.open('task.description');
  protected readonly discussionOpen = this.sections.open('task.discussion');

  // no type for a task, so three rows
  readonly facts = computed<WorkItemFacts>(() => ({
    priority: this.task().priority,
    assignee: this.task().assignee,
    deadline: this.task().deadline,
    closed: this.task().status.id === WorkTaskStatus.Done,
  }));

  private readonly fragment = toSignal(inject(ActivatedRoute).fragment, { initialValue: null });

  constructor() {
    // a link to a comment opens the discussion even if it was folded
    effect(() => {
      if (this.fragment()?.startsWith('comment-')) this.discussionOpen.set(true);
    });
  }
}
