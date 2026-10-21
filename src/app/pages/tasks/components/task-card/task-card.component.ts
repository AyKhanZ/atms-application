import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../../core/i18n/active-language';
import { workTaskKind, workTaskRoute } from '../../../../core/utils/work-task.utils';
import { BoardColumnModel } from '../../../../core/models/board-columns';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';
import { OverdueBadgeComponent } from '../../../../shared/components/overdue-badge/overdue-badge.component';
import { daysFromToday, isOverdueTask } from '../../../../core/utils/deadline.utils';
import { TaskContextComponent } from '../task-context/task-context.component';

@Component({
  selector: 'app-task-card',
  imports: [
    MenuModule,
    RouterLink,
    WorkItemRefComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
    TaskContextComponent,
    OverdueBadgeComponent,
    TranslocoDirective,
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  private readonly transloco = inject(TranslocoService);
  readonly task = input.required<WorkTaskModel>();
  // the page mixes several projects
  readonly showProject = input(false);
  // off for people who cant edit
  readonly canMove = input(false);
  readonly columns = input<BoardColumnModel[]>([]);
  readonly moveTo = output<number>();
  readonly moveToTop = output<void>();

  protected readonly kind = computed(() => workTaskKind(this.task()));
  protected readonly route = computed(() => workTaskRoute(this.task()));

  protected readonly done = computed(() => this.task().status.id === WorkTaskStatus.Done);

  protected readonly overdue = computed(() => isOverdueTask(this.task()));

  // further dates arent worth a place on the card
  protected readonly dueSoon = computed(() => {
    currentLanguage();
    const { deadline } = this.task();
    if (!deadline || this.done()) return null;
    const days = daysFromToday(deadline);
    if (days === 0) return this.transloco.translate('notifications.actions.dueToday');
    if (days === 1) return this.transloco.translate('workItem.dueTomorrow');
    return null;
  });

  protected readonly menu = computed<MenuItem[]>(() => {
    currentLanguage();
    const current = this.task().boardColumn?.id ?? this.task().status.id;
    const done = this.task().status.id === WorkTaskStatus.Done;
    const moves: MenuItem[] = this.canMove()
      ? [
          ...this.columns()
            .filter((target) => target.id !== current)
            .map((target) => ({
              label: this.transloco.translate('workItem.moveTo', { status: target.label }),
              icon: 'pi pi-arrow-right',
              command: () => this.moveTo.emit(target.id),
            })),
          ...(done
            ? []
            : [
                {
                  label: this.transloco.translate('workItem.moveToTop'),
                  icon: 'pi pi-arrow-up',
                  command: () => this.moveToTop.emit(),
                },
              ]),
          { separator: true },
        ]
      : [];
    return [
      ...moves,
      {
        label: this.transloco.translate('common.open'),
        icon: 'pi pi-external-link',
        routerLink: this.route(),
      },
    ];
  });
}
