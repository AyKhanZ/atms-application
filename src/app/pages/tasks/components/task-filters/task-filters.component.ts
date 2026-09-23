import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { LabelForDirective } from '../../../../core/directives/label-for.directive';
import { WorkItemKind } from '../../../../core/models/work-items';
import {
  WorkTaskBoardDeadline,
  WorkTaskBoardFilter,
} from '../../../../core/models/work-task-board';
import { ClearButtonComponent } from '../../../../shared/components/clear-button/clear-button.component';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { hasFilters } from '../../tasks-page.utils';

export interface FilterOption<T = string> {
  value: T;
  /** What the dropdown searches and what a summary of the choice shows. */
  label: string;
  /** Drawn as the kind's icon and code in front of the title, as in details and search. */
  ref?: { kind: WorkItemKind; code: number | string; title: string };
  /** A line above this option, separating the special entries from the people. */
  divider?: boolean;
}

/** "Nobody" in the Assigned to list; never a real user id. */
const unassigned = 'none';

/**
 * The filter panel of the Tasks page, opened by the Filter button the way the Projects, Users and
 * Organizations lists do it. Unlike those, a choice applies at once: a board is looked at while it
 * is being narrowed, and an Apply step would only slow that down.
 */
@Component({
  selector: 'app-task-filters',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MultiSelectModule,
    SelectModule,
    LabelForDirective,
    ClearButtonComponent,
    WorkItemRefComponent,
  ],
  templateUrl: './task-filters.component.html',
  styleUrl: './task-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFiltersComponent {
  readonly filter = input.required<WorkTaskBoardFilter>();
  readonly projects = input<FilterOption[]>([]);
  readonly tickets = input<FilterOption[]>([]);
  /** The signed-in user, listed as "Me". */
  readonly me = input<FilterOption | null>(null);
  /** Everyone else who can be assigned, by name. */
  readonly people = input<FilterOption[]>([]);
  readonly statuses = input<FilterOption<number>[]>([]);
  readonly priorities = input<FilterOption<number>[]>([]);
  readonly filterChange = output<WorkTaskBoardFilter>();
  readonly cleared = output<void>();

  /** The same width however much the search has narrowed the options; never wider than a phone. */
  readonly panelStyle = { width: 'min(24rem, calc(100vw - 2rem))' };

  readonly types: FilterOption<WorkItemKind.Task | WorkItemKind.Subtask | null>[] = [
    { value: null, label: 'All' },
    { value: WorkItemKind.Task, label: 'Task' },
    { value: WorkItemKind.Subtask, label: 'Subtask' },
  ];

  readonly deadlines: FilterOption<WorkTaskBoardDeadline>[] = [
    { value: 'any', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'none', label: 'No deadline' },
  ];

  /** Tickets of different projects in one list mean nothing; one project has to be chosen first. */
  readonly ticketsEnabled = computed(() => this.filter().projectIds.length === 1);

  /** Me and Unassigned together at the top — the two picked most — then everyone else. */
  readonly peopleOptions = computed<FilterOption[]>(() => {
    const me = this.me();
    const special = [...(me ? [me] : []), { value: unassigned, label: 'Unassigned' }];
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
    // Tickets belong to the project they were picked in; another project choice drops them.
    if (patch.projectIds && next.projectIds.length !== 1) next.workTicketIds = [];
    this.filterChange.emit(next);
  }

  changePeople(values: string[]): void {
    this.change({
      assigneeUserIds: values.filter((value) => value !== unassigned),
      unassigned: values.includes(unassigned),
    });
  }

  /**
   * "Payment Gateway +1": the first choice by name, so the field says what it holds. Empty when
   * nothing is chosen — the placeholder ("All", "Anyone") is drawn by the dropdown itself.
   */
  summary(selected: readonly FilterOption<unknown>[] | null): string {
    if (!selected?.length) return '';
    const [first] = selected;
    const name = first.ref?.title ?? first.label;
    return selected.length > 1 ? `${name} +${selected.length - 1}` : name;
  }
}
