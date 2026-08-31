import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ProjectPermissions } from '../../../../core/enums/project-permissions.enum';
import { WorkProjectModel } from '../../../../core/models/work-projects';
import { WorkTicketModel } from '../../../../core/models/work-tickets';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { ProjectAccessService } from '../../../../core/services/project-access.service';
import { SnackBarService } from '../../../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../../../core/services/work-projects.service';
import { WorkTicketsService } from '../../../../core/services/work-tickets.service';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../../../shared/components/entity-tabs/entity-tabs.component';
import { PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { TicketFactsComponent } from '../components/ticket-facts/ticket-facts.component';
import { TicketLocationComponent } from '../components/ticket-location/ticket-location.component';
import { TicketStatusBadgeComponent } from '../components/ticket-status-badge/ticket-status-badge.component';

export type TicketTab = 'details' | 'tasks' | 'attachments' | 'history';

const TICKET_TABS: readonly EntityTab<TicketTab>[] = [
  { id: 'details', label: 'Details', icon: 'pi-align-left' },
  { id: 'tasks', label: 'Tasks', icon: 'pi-list-check' },
  { id: 'attachments', label: 'Attachments', icon: 'pi-paperclip' },
  { id: 'history', label: 'History', icon: 'pi-history' },
];

@Component({
  selector: 'app-ticket-details',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BackButtonComponent,
    EmptyStateComponent,
    EntityTabsComponent,
    TicketFactsComponent,
    TicketLocationComponent,
    TicketStatusBadgeComponent,
    PersonNamePipe,
    RelativeTimePipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './ticket-details.component.html',
  styleUrl: './ticket-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workProjectsService = inject(WorkProjectsService);
  private readonly workTicketsService = inject(WorkTicketsService);
  private readonly projectAccess = inject(ProjectAccessService);
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
  readonly activeTab = signal<TicketTab>('details');
  readonly tabs = TICKET_TABS;

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
        this.canEdit.set(result.permissions.includes(ProjectPermissions.Ticket.Edit));
        this.canDelete.set(result.permissions.includes(ProjectPermissions.Ticket.Delete));
        this.breadcrumbOverride.set(
          this.projectBreadcrumbPath,
          `#${result.project.code} ${result.project.title}`,
        );
        this.ticketBreadcrumbPath = `/projects/${this.projectId}/tickets/${result.ticket.id}`;
        this.breadcrumbOverride.set(
          this.ticketBreadcrumbPath,
          `#${result.ticket.code} ${result.ticket.title}`,
        );
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

  back(): void {
    this.viewInPlan();
  }

  edit(): void {
    const ticketId = this.ticketId();
    if (!this.projectId || !ticketId || !this.canEdit()) return;
    void this.router.navigate(['/projects', this.projectId, 'tickets', ticketId, 'edit']);
  }

  confirmDelete(): void {
    const ticket = this.ticket();
    if (!ticket || !this.canDelete() || this.deleting()) return;

    this.confirmation.confirm({
      key: 'ticketDelete',
      header: 'Delete ticket?',
      message: `The ticket "#${ticket.code} ${ticket.title}" will be permanently removed. This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => this.deleteTicket(ticket),
    });
  }

  viewInPlan(): void {
    const ticket = this.ticket();
    if (!this.projectId) return;

    void this.router.navigate(['/projects', this.projectId], {
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
      this.breadcrumbOverride.set(this.ticketBreadcrumbPath, 'Ticket');
    }

    this.ticketId.set(ticketId);
    this.ticket.set(null);
    this.canEdit.set(false);
    this.canDelete.set(false);
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
          this.snackBar.success('Ticket deleted successfully.');
          this.viewInPlan();
        },
        error: () => this.snackBar.error('The ticket could not be deleted. Please try again.'),
      });
  }
}

export function parseTicketTab(value: string | null): TicketTab {
  return value === 'tasks' || value === 'attachments' || value === 'history' ? value : 'details';
}

export function ticketTabQueryParam(tab: TicketTab): string | null {
  return tab === 'details' ? null : tab;
}
