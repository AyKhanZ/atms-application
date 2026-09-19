import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { GlobalSearchItemModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { WorkItemAssigneeComponent } from '../work-item-assignee/work-item-assignee.component';
import { WorkItemRefComponent } from '../work-item-ref/work-item-ref.component';
import { workItemKinds } from '../work-item-ref/work-item-kinds';
import { ProjectStatusBadgeComponent } from '../../../pages/projects/components/status-badge/project-status-badge.component';
import { TicketStatusBadgeComponent } from '../../../pages/projects/tickets/components/ticket-status-badge/ticket-status-badge.component';
import { TaskStatusBadgeComponent } from '../../../pages/projects/tasks/components/task-status-badge/task-status-badge.component';

interface TrailStep {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-search-result-row',
  imports: [
    WorkItemRefComponent,
    WorkItemAssigneeComponent,
    ProjectStatusBadgeComponent,
    TicketStatusBadgeComponent,
    TaskStatusBadgeComponent,
  ],
  templateUrl: './search-result-row.component.html',
  styleUrl: './search-result-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResultRowComponent {
  readonly item = input.required<GlobalSearchItemModel>();
  /** The text that was typed, so the part that matched can be picked out of the title. */
  readonly query = input('');
  readonly active = input(false);
  /** Off where the owner drives the highlight itself, so hover and arrows never light two rows. */
  readonly followsPointer = input(true);

  readonly kind = computed(() => workItemKinds[this.item().itemType]);

  /**
   * Where the item sits, outermost first. A project has no trail — it is the trail. The project
   * itself opens the chain because search crosses projects and the name alone is ambiguous.
   */
  readonly trail = computed<TrailStep[]>(() => {
    const item = this.item();
    if (item.itemType === WorkItemKind.Project) return [];

    const steps: TrailStep[] = [{ icon: 'pi-briefcase', label: item.project.name }];
    if (item.group) steps.push({ icon: 'pi-folder', label: item.group.name });
    if (item.milestone) steps.push({ icon: 'pi-flag', label: item.milestone.name });
    if (item.ticket)
      steps.push({ icon: 'pi-ticket', label: `#${item.ticket.code} ${item.ticket.name}` });
    if (item.parentTask) {
      steps.push({
        icon: 'pi-check-square',
        label: `#${item.parentTask.code} ${item.parentTask.name}`,
      });
    }

    return steps;
  });

  readonly trailLabel = computed(() =>
    this.trail()
      .map((step) => step.label)
      .join(' › '),
  );
  readonly visibleTrail = computed(() => {
    const steps = this.trail();
    return steps.length > 2 ? [steps[0], steps[steps.length - 1]] : steps;
  });

  /** The title split into plain and matched pieces, so the match can be marked without innerHTML. */
  readonly titleParts = computed<{ text: string; matched: boolean }[]>(() => {
    const title = this.item().title;
    const query = this.query().trim();
    if (query.length === 0) return [{ text: title, matched: false }];

    const parts: { text: string; matched: boolean }[] = [];
    const haystack = title.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    let from = 0;

    for (let at = haystack.indexOf(needle, from); at >= 0; at = haystack.indexOf(needle, from)) {
      if (at > from) parts.push({ text: title.slice(from, at), matched: false });
      parts.push({ text: title.slice(at, at + needle.length), matched: true });
      from = at + needle.length;
    }

    if (from < title.length) parts.push({ text: title.slice(from), matched: false });
    return parts;
  });
}
