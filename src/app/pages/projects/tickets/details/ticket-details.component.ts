import { workItemProgressBadge } from '../../../../core/utils/work-item-progress.utils';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
  computed,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ProjectPermissions } from '../../../../core/enums/project-permissions.enum';
import { WorkProjectModel } from '../../../../core/models/work-projects';
import { WorkTicketModel } from '../../../../core/models/work-tickets';
import { WorkTicketStatus } from '../../../../core/enums/work-ticket-status.enum';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { WorkItemKind } from '../../../../core/models/work-items';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { RecentWorkItemsService } from '../../../../core/services/recent-work-items.service';
import { ProjectAccessService } from '../../../../core/services/project-access.service';
import { ProjectPermissionsRefreshService } from '../../../../core/services/project-permissions-refresh.service';
import { SnackBarService } from '../../../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../../../core/services/work-projects.service';
import { WorkTicketsService } from '../../../../core/services/work-tickets.service';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { HistoryTabComponent } from '../../history/history-tab/history-tab.component';
import { TicketAttachmentsTabComponent } from '../../attachments/ticket-attachments-tab/ticket-attachments-tab.component';
import { AttachmentTreeExpansionService } from '../../attachments/attachment-tree-expansion.service';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../../../shared/components/entity-tabs/entity-tabs.component';
import { PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { WorkItemFactsComponent } from '../../../../shared/components/work-item-facts/work-item-facts.component';
import { WorkItemFacts } from '../../../../shared/components/work-item-facts/work-item-facts.model';
import { TicketLocationComponent } from '../components/ticket-location/ticket-location.component';
import { TicketStatusBadgeComponent } from '../components/ticket-status-badge/ticket-status-badge.component';
import { WorkTaskListComponent } from '../../tasks/components/work-task-list/work-task-list.component';
import { NavigationHistoryService } from '../../../../core/services/navigation-history.service';
import { validationMessage } from '../../../../core/utils/http-error.utils';
import {
  TicketTab,
  parseTicketTab,
  ticketDeleteBlockedConfirmation,
  ticketDeleteConfirmation,
  ticketHasTasks,
  ticketTabQueryParam,
} from './ticket-details.utils';

@Component({
  selector: 'app-ticket-details',
  imports: [
    WorkItemRefComponent,
    ButtonModule,
    ConfirmDialogComponent,
    BackButtonComponent,
    HistoryTabComponent,
    TicketAttachmentsTabComponent,
    EntityTabsComponent,
    WorkItemFactsComponent,
    TicketLocationComponent,
    TicketStatusBadgeComponent,
    WorkTaskListComponent,
    PersonNamePipe,
    RelativeTimePipe,
  ],
  providers: [ConfirmationService, AttachmentTreeExpansionService],
  templateUrl: './ticket-details.component.html',
  styleUrl: './ticket-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailsComponent implements OnDestroy {
  protected readonly kinds = WorkItemKind;
  private readonly route = inject(ActivatedRoute);
  private readonly recent = inject(RecentWorkItemsService);
  private readonly router = inject(Router);
  private readonly navigationHistory = inject(NavigationHistoryService);
  private readonly workProjectsService = inject(WorkProjectsService);
  private readonly workTicketsService = inject(WorkTicketsService);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly permissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);

  readonly projectId = this.route.snapshot.paramMap.get('projectId');
  private readonly projectBreadcrumbPath = `/projects/${this.projectId}`;
  private ticketBreadcrumbPath = '';

  readonly project = signal<WorkProjectModel | null>(null);
  readonly ticket = signal<WorkTicketModel | null>(null);
  readonly ticketId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly deleting = signal(false);
  readonly canEdit = signal(false);
  readonly canDelete = signal(false);
  readonly canCreateTask = signal(false);
  readonly canEditTask = signal(false);
  readonly activeTab = signal<TicketTab>('details');
  /** Built here rather than as a template literal, which would allocate on every change detection. */
  readonly facts = computed<WorkItemFacts | null>(() => {
    const ticket = this.ticket();
    if (!ticket) return null;

    return {
      type: ticket.workTicketType,
      priority: ticket.priority,
      assignee: ticket.assignee,
      deadline: ticket.deadline,
      closed: [WorkTicketStatus.Closed, WorkTicketStatus.Rejected].includes(
        ticket.workTicketStatus.id,
      ),
    };
  });
  readonly tabs = computed<readonly EntityTab<TicketTab>[]>(() => {
    const ticket = this.ticket();
    return [
      { id: 'details', label: 'Details', icon: 'pi-align-left' },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: 'pi-list-check',
        badge: workItemProgressBadge(ticket?.doneTaskCount, ticket?.totalTaskCount),
      },
      { id: 'attachments', label: 'Attachments', icon: 'pi-paperclip' },
      { id: 'history', label: 'History', icon: 'pi-history' },
    ];
  });

  constructor() {
    // Claim both crumb slots up front. Without this the trail is a segment shorter until the
    // request lands and then visibly jumps; a placeholder keeps its shape and only sharpens
    // the label once the real titles arrive.
    this.breadcrumbOverride.set(this.projectBreadcrumbPath, 'Project');

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.activeTab.set(parseTicketTab(params.get('tab')));
    });

    this.route.paramMap
      .pipe(
        map((params) => params.get('ticketId')),
        switchMap((ticketId) => this.loadTicket(ticketId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;

        this.project.set(result.project);
        this.ticket.set(result.ticket);
        this.applyPermissions(result.permissions);
        this.breadcrumbOverride.set(
          this.projectBreadcrumbPath,
          `#${result.project.code} ${result.project.title}`,
        );
        this.ticketBreadcrumbPath = `/projects/${this.projectId}/tickets/${result.ticket.id}`;
        this.breadcrumbOverride.set(
          this.ticketBreadcrumbPath,
          `#${result.ticket.code} ${result.ticket.title}`,
          'pi-ticket',
        );
        this.recent.track(WorkItemKind.Ticket, result.ticket.id);
      });
  }

  ngOnDestroy(): void {
    this.breadcrumbOverride.clear(this.projectBreadcrumbPath);
    if (this.ticketBreadcrumbPath) this.breadcrumbOverride.clear(this.ticketBreadcrumbPath);
  }

  selectTab(tab: TicketTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: ticketTabQueryParam(tab) },
      queryParamsHandling: 'merge',
    });
  }

  /** Where the user came from; the ticket's place in the plan when that is unknown. */
  back(): void {
    if (!this.navigationHistory.back()) this.viewInPlan();
  }

  edit(): void {
    const ticketId = this.ticketId();
    if (!this.projectId || !ticketId || !this.canEdit()) return;
    void this.router.navigate(['/projects', this.projectId, 'tickets', ticketId, 'edit'], {
      state: { returnUrl: this.router.url },
    });
  }

  confirmDelete(): void {
    const ticket = this.ticket();
    if (!ticket || !this.canDelete() || this.deleting()) return;
    // Blocked and confirmed deletions are both answered in the same dialog, the way a task does
    // it: a toast for the refusal put the explanation somewhere the user was not looking.
    this.confirmation.confirm(
      ticketHasTasks(ticket)
        ? ticketDeleteBlockedConfirmation(ticket)
        : ticketDeleteConfirmation(ticket, () => this.deleteTicket(ticket)),
    );
  }

  /** After a delete the plan replaces the gone page in the history, so Back does not return to it. */
  viewInPlan(replaceHistory = false): void {
    const ticket = this.ticket();
    if (!this.projectId) return;

    void this.router.navigate(['/projects', this.projectId], {
      state: { replaceHistory },
      queryParams: {
        tab: 'plan',
        groupId: ticket?.groupId ?? null,
        milestoneId: ticket?.milestoneId ?? null,
      },
    });
  }

  private loadTicket(ticketId: string | null) {
    if (this.ticketBreadcrumbPath) {
      this.breadcrumbOverride.clear(this.ticketBreadcrumbPath);
      this.ticketBreadcrumbPath = '';
    }

    if (ticketId) {
      this.ticketBreadcrumbPath = `/projects/${this.projectId}/tickets/${ticketId}`;
      this.breadcrumbOverride.set(this.ticketBreadcrumbPath, 'Ticket', 'pi-ticket');
    }

    this.ticketId.set(ticketId);
    this.ticket.set(null);
    this.canEdit.set(false);
    this.canDelete.set(false);
    this.canCreateTask.set(false);
    this.canEditTask.set(false);
    this.loading.set(true);
    this.loadError.set(false);

    if (!this.projectId || !ticketId) {
      this.loading.set(false);
      this.loadError.set(true);
      return of(null);
    }

    return forkJoin({
      project: this.workProjectsService.getProject(this.projectId),
      ticket: this.workTicketsService.getWorkTicket(this.projectId, ticketId),
      permissions: this.projectAccess.getPermissions(this.projectId),
    }).pipe(
      catchError(() => {
        this.loadError.set(true);
        return of(null);
      }),
      finalize(() => {
        if (this.ticketId() === ticketId) this.loading.set(false);
      }),
    );
  }

  private applyPermissions(permissions: string[]): void {
    this.canEdit.set(permissions.includes(ProjectPermissions.Ticket.Edit));
    this.canDelete.set(permissions.includes(ProjectPermissions.Ticket.Delete));
    this.canCreateTask.set(permissions.includes(ProjectPermissions.Task.Create));
    this.canEditTask.set(permissions.includes(ProjectPermissions.Task.Edit));
  }

  /** A 403 means the cached permissions are already wrong; re-read them so the page stops
   *  offering an action the server refuses. */
  private refreshPermissionsAfterForbidden(error: HttpErrorResponse): void {
    if (error.status !== 403 || !this.projectId) return;
    this.permissionsRefresh
      .refreshAfterForbidden(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (permissions) => this.applyPermissions(permissions),
        error: () => undefined,
      });
  }

  private deleteTicket(ticket: WorkTicketModel): void {
    if (!this.projectId) return;
    this.deleting.set(true);
    this.workTicketsService
      .deleteWorkTicket(this.projectId, ticket.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.snackBar.success('Ticket deleted.');
          this.viewInPlan(true);
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.error(
            validationMessage(error) ?? 'The ticket could not be deleted. Please try again.',
          );
          this.refreshPermissionsAfterForbidden(error);
        },
      });
  }
}
