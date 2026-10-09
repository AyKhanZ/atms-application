import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../../core/i18n/active-language';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { LabelForDirective } from '../../../../core/directives/label-for.directive';
import { WorkItemKind } from '../../../../core/models/work-items';
import {
  WorkTaskBoardDeadline,
  WorkTaskBoardFilter,
} from '../../../../core/models/work-task-board';
import { ClearButtonComponent } from '../../../../shared/components/clear-button/clear-button.component';
import { hasFilters } from '../../tasks-page.utils';
import { RefMultiselectComponent } from '../ref-multiselect/ref-multiselect.component';
import { FilterOption, filterPanelStyle } from './filter-option';
import { FilterSummaryPipe } from './filter-summary.pipe';
import { RemoteOptions } from '../../remote-options';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';

// never a real user id
const unassigned = 'none';

// unlike other lists a choice applies at once, Apply would only slow narrowing down
@Component({
  selector: 'app-task-filters',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MultiSelectModule,
    SelectModule,
    LabelForDirective,
    TranslocoDirective,
    ClearButtonComponent,
    RefMultiselectComponent,
    FilterSummaryPipe,
    WorkItemAssigneeComponent,
  ],
  templateUrl: './task-filters.component.html',
  styleUrl: './task-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFiltersComponent {
  private readonly transloco = inject(TranslocoService);
  readonly filter = input.required<WorkTaskBoardFilter>();
  readonly calendar = input(false);
  // searched on the server, a page at a time
  readonly projects = input<RemoteOptions | null>(null);
  readonly tickets = input<RemoteOptions | null>(null);
  readonly me = input<FilterOption | null>(null);
  readonly people = input<FilterOption[]>([]);
  readonly statuses = input<FilterOption<number>[]>([]);
  readonly priorities = input<FilterOption<number>[]>([]);
  readonly filterChange = output<WorkTaskBoardFilter>();
  readonly cleared = output<void>();

  readonly panelStyle = filterPanelStyle;

  readonly types = computed<FilterOption<WorkItemKind.Task | WorkItemKind.Subtask | null>[]>(() => {
    currentLanguage();
    return [
      { value: null, label: this.transloco.translate('tasks.all') },
      { value: WorkItemKind.Task, label: this.transloco.translate('workItem.kind.task') },
      { value: WorkItemKind.Subtask, label: this.transloco.translate('workItem.kind.subtask') },
    ];
  });

  readonly deadlines = computed(() => {
    currentLanguage();
    return [
      { value: 'any', label: this.transloco.translate('tasks.all') },
      { value: 'overdue', label: this.transloco.translate('tasks.overdue') },
      {
        value: 'none',
        label: this.transloco.translate('tasks.deadlineNone'),
        disabled: this.calendar(),
      },
    ] satisfies (FilterOption<WorkTaskBoardDeadline> & { disabled?: boolean })[];
  });

  // tickets from different projects mean nothing, pick one project first
  readonly ticketsEnabled = computed(() => this.filter().projectIds.length === 1);
  // says why its off and how to turn it on
  readonly ticketPlaceholder = computed(() => {
    currentLanguage();
    const projects = this.filter().projectIds.length;
    if (projects === 1) return this.transloco.translate('tasks.all');
    return this.transloco.translate(
      projects === 0 ? 'tasks.selectProjectForTicket' : 'tasks.oneProjectForTicket',
    );
  });

  // Me and Unassigned on top, then everyone else
  readonly peopleOptions = computed<FilterOption[]>(() => {
    currentLanguage();
    const me = this.me();
    const special = [
      ...(me ? [me] : []),
      { value: unassigned, label: this.transloco.translate('common.unassigned') },
    ];
    return [
      ...special,
      ...this.people().map((person, index) => ({ ...person, divider: index === 0 })),
    ];
  });

  readonly peopleValue = computed(() => [
    ...this.filter().assigneeUserIds,
    ...(this.filter().unassigned ? [unassigned] : []),
  ]);

  readonly canClear = computed(() => hasFilters(this.filter()));

  change(patch: Partial<WorkTaskBoardFilter>): void {
    const next = { ...this.filter(), ...patch };
    // another project choice drops the picked tickets
    if (patch.projectIds && next.projectIds.length !== 1) next.workTicketIds = [];
    this.filterChange.emit(next);
  }

  changePeople(values: string[]): void {
    this.change({
      assigneeUserIds: values.filter((value) => value !== unassigned),
      unassigned: values.includes(unassigned),
    });
  }
}
