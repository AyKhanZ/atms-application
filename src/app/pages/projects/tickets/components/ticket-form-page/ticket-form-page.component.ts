import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  of,
  switchMap,
  take,
} from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  askToCloseOpenWork,
  workItemRef,
} from '../../../../../shared/components/confirm-dialog/close-open-work';
import { currentLanguage } from '../../../../../core/i18n/active-language';
import { WorkTicketStatus } from '../../../../../core/enums/work-ticket-status.enum';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { MilestoneOptionModel } from '../../../../../core/models/work-groups';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import {
  CreateWorkTicketCommand,
  UpdateWorkTicketCommand,
  WorkTicketModel,
} from '../../../../../core/models/work-tickets';
import { BreadcrumbOverrideService } from '../../../../../core/services/breadcrumb-override.service';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { ProjectPermissionsRefreshService } from '../../../../../core/services/project-permissions-refresh.service';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
import { WorkGroupsService } from '../../../../../core/services/work-groups.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import { projectNavigationUrl } from '../../../../../core/utils/project-navigation.utils';
import { formatDateInput, parseDisplayDate } from '../../../../../core/utils/date-input.utils';
import { BackButtonComponent } from '../../../../../shared/components/back-button/back-button.component';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { LoadMoreButtonComponent } from '../../../../../shared/components/load-more-button/load-more-button.component';
import { LabelForDirective } from '../../../../../core/directives/label-for.directive';
import {
  MilestoneOption,
  groupMilestones,
  toMilestoneOption,
  uniqueMilestones,
} from './ticket-milestone-options';
import {
  WorkTicketsStoreActions,
  WorkTicketsStoreSelectors,
} from '../../../../../store/work-tickets';
import { WorkItemMutationError } from '../../../../../core/models/work-items';
import { LoadingStateComponent } from '../../../../../shared/components/loading-state/loading-state.component';
import { withoutInactive } from '../../../../../core/utils/assignee-options.utils';

interface TicketFormNavigationState {
  milestone?: MilestoneOptionModel;
  returnUrl?: unknown;
}

@Component({
  selector: 'app-ticket-form-page',
  imports: [
    LoadingStateComponent,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    ConfirmDialogComponent,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    BackButtonComponent,
    ProfileAvatarComponent,
    LoadMoreButtonComponent,
    LabelForDirective,
    TranslocoDirective,
  ],
  providers: [ConfirmationService],
  templateUrl: './ticket-form-page.component.html',
  styleUrls: [
    '../../../components/form-page/form-page.component.scss',
    './ticket-form-page.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFormPageComponent implements OnDestroy {
  readonly mode = input.required<'create' | 'edit'>();

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workTicketsService = inject(WorkTicketsService);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly workProjectsService = inject(WorkProjectsService);
  private readonly workGroupsService = inject(WorkGroupsService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly snackBar = inject(SnackBarService);
  private readonly permissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private readonly transloco = inject(TranslocoService);
  private readonly milestoneSearchChanges = new Subject<string>();
  private readonly navigationState = history.state as TicketFormNavigationState;
  private navigationComplete = false;
  private milestoneSearch = '';

  readonly projectId = this.route.snapshot.paramMap.get('projectId');
  readonly ticketId = this.route.snapshot.paramMap.get('ticketId');
  private readonly projectBreadcrumbPath = `/projects/${this.projectId}`;
  private readonly ticketBreadcrumbPath = `/projects/${this.projectId}/tickets/${this.ticketId}`;
  readonly submitted = signal(false);
  readonly loading = signal(true);
  readonly saving = this.store.selectSignal(WorkTicketsStoreSelectors.isSaving);
  readonly loadError = signal<string | null>(null);
  readonly project = signal<WorkProjectModel | null>(null);
  readonly ticket = signal<WorkTicketModel | null>(null);
  // inactive people are left out, the one saved on the ticket stays so the form shows them
  readonly assigneeOptions = computed(() =>
    withoutInactive(this.project()?.participants ?? [], this.ticket()?.assignee?.id),
  );
  readonly milestones = signal<MilestoneOption[]>([]);
  readonly milestonesLoading = signal(false);
  readonly milestonesHaveMore = signal(false);
  readonly milestonesNextCursor = signal<string | null>(null);
  readonly ticketTypes = signal<DictionaryModel[]>([]);
  readonly priorities = signal<DictionaryModel[]>([]);
  readonly ticketStatuses = signal<DictionaryModel[]>([]);
  readonly milestoneGroups = computed(() => groupMilestones(this.milestones()));
  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly pageTitle = computed(() => {
    currentLanguage();
    return this.transloco.translate(this.isEdit() ? 'tickets.edit' : 'tickets.create');
  });
  readonly submitLabel = computed(() => {
    currentLanguage();
    return this.transloco.translate(this.isEdit() ? 'common.save' : 'common.create');
  });
  // returns to the caller (e.g. the ticket), Plan when opened directly by url
  readonly returnUrl =
    projectNavigationUrl(this.navigationState.returnUrl) ??
    (this.projectId ? `/projects/${this.projectId}?tab=plan` : '/projects');

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(2000)],
    milestoneId: [null as string | null, Validators.required],
    workTicketTypeId: [null as number | null, Validators.required],
    priorityId: [null as number | null, Validators.required],
    workTicketStatusId: [null as number | null],
    deadline: [null as Date | null],
    assigneeId: [null as string | null],
  });

  constructor() {
    if (!this.projectId) {
      this.loading.set(false);
      this.loadError.set(this.transloco.translate('tickets.routeInvalid'));
      return;
    }

    const projectId = this.projectId;
    this.milestoneSearchChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((search) => {
          this.milestoneSearch = search.trim();
          this.milestonesLoading.set(true);
          return this.workGroupsService
            .getMilestones(projectId, {
              search: this.milestoneSearch || null,
              pageSize: 50,
            })
            .pipe(
              catchError(() => {
                this.milestonesLoading.set(false);
                this.snackBar.error(this.transloco.translate('tickets.milestonesFailed'));
                return of({ items: [], nextCursor: null, hasMore: false, pageSize: 50 });
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        this.applyMilestonePage(page.items, page.nextCursor, page.hasMore, false);
        this.milestonesLoading.set(false);
      });

    forkJoin({
      project: this.workProjectsService.getProject(this.projectId),
      milestones: this.workGroupsService.getMilestones(this.projectId, { pageSize: 50 }),
      ticketTypes: this.dictionaryService.getWorkTicketTypeDictionaries(),
      priorities: this.dictionaryService.getWorkItemPriorityDictionaries(),
      ticketStatuses: this.ticketId
        ? this.dictionaryService.getWorkTicketStatusDictionaries()
        : of([]),
      ticket: this.ticketId
        ? this.workTicketsService.getWorkTicket(this.projectId, this.ticketId)
        : of(null),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError.set(this.transloco.translate('tickets.formFailed'));
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;

        this.project.set(result.project);
        this.breadcrumbOverride.set(
          this.projectBreadcrumbPath,
          `#${result.project.code} ${result.project.title}`,
        );
        if (result.ticket) {
          this.breadcrumbOverride.set(
            this.ticketBreadcrumbPath,
            `#${result.ticket.code} ${result.ticket.title}`,
          );
        }
        this.applyMilestonePage(
          result.milestones.items,
          result.milestones.nextCursor,
          result.milestones.hasMore,
          false,
        );
        this.ticketTypes.set(result.ticketTypes);
        this.priorities.set(result.priorities);
        this.ticketStatuses.set(result.ticketStatuses);
        this.ticket.set(result.ticket);

        if (result.ticket) {
          this.form.controls.workTicketStatusId.addValidators(Validators.required);
          this.patchForm(result.ticket);
        } else {
          this.applyInitialMilestone();
        }
      });
  }

  ngOnDestroy(): void {
    this.breadcrumbOverride.clear(this.projectBreadcrumbPath);
    this.breadcrumbOverride.clear(this.ticketBreadcrumbPath);
  }

  submit(): void {
    this.submitted.set(true);
    if (!this.projectId || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const createCommand = this.createCommand();
    if (!createCommand) return;

    const statusId = this.form.controls.workTicketStatusId.value;
    if (this.ticketId && statusId === null) {
      this.form.controls.workTicketStatusId.markAsTouched();
      return;
    }

    // Closed with open tasks: ask, dont refuse and dont do it silently
    const ticket = this.ticket();
    const openTasks = (ticket?.totalTaskCount ?? 0) - (ticket?.doneTaskCount ?? 0);
    const closing =
      statusId === WorkTicketStatus.Closed &&
      ticket?.workTicketStatus.id !== WorkTicketStatus.Closed;
    if (ticket && closing && openTasks > 0) {
      void askToCloseOpenWork(this.confirmation, this.transloco, {
        key: 'ticketClose',
        itemRef: workItemRef(this.transloco, 'workItem.kind.ticket', ticket.code),
        title: ticket.title,
        openCount: openTasks,
        child: 'task',
      }).then((choice) => {
        if (choice !== 'cancel') this.save(choice === 'all');
      });
      return;
    }

    this.save(false);
  }

  private save(completeTasks: boolean): void {
    const createCommand = this.createCommand();
    const statusId = this.form.controls.workTicketStatusId.value;
    if (!createCommand || !this.projectId) return;

    // one save at a time, the button is disabled meanwhile
    this.actions$
      .pipe(
        ofType(
          WorkTicketsStoreActions.createTicketSuccess,
          WorkTicketsStoreActions.updateTicketSuccess,
          WorkTicketsStoreActions.createTicketFailure,
          WorkTicketsStoreActions.updateTicketFailure,
        ),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if ('error' in action) {
          this.snackBar.error(ticketErrorMessage(action.error, this.transloco));
          // cached permissions said ok, drop them so the next page is right
          if (action.error.status === 403 && this.projectId) {
            this.permissionsRefresh
              .refreshAfterForbidden(this.projectId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ error: () => undefined });
          }
          return;
        }
        this.navigationComplete = true;
        this.snackBar.success(
          this.transloco.translate(this.ticketId ? 'tickets.saved' : 'tickets.created'),
        );
        this.navigateBack();
      });

    this.store.dispatch(
      this.ticketId && statusId !== null
        ? WorkTicketsStoreActions.updateTicket({
            projectId: this.projectId,
            ticketId: this.ticketId,
            command: {
              ...createCommand,
              workTicketStatusId: statusId,
              completeTasks,
            } satisfies UpdateWorkTicketCommand,
          })
        : WorkTicketsStoreActions.createTicket({
            projectId: this.projectId,
            command: createCommand,
          }),
    );
  }

  cancel(): void {
    if (!this.hasUnsavedChanges()) {
      this.navigateBack();
      return;
    }

    void this.confirmUnsavedChanges().then((confirmed) => {
      if (confirmed) this.navigateBack();
    });
  }

  hasUnsavedChanges(): boolean {
    return !this.navigationComplete && this.form.dirty;
  }

  confirmUnsavedChanges(): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmation.confirm({
        header: this.transloco.translate('settings.discardTitle'),
        message: this.transloco.translate('tickets.discardMessage'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.transloco.translate('common.leave'),
        rejectLabel: this.transloco.translate('settings.stay'),
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.navigationComplete = true;
          resolve(true);
        },
        reject: () => resolve(false),
      });
    });
  }

  error(
    name: 'title' | 'milestoneId' | 'workTicketTypeId' | 'priorityId' | 'workTicketStatusId',
  ): string {
    const control = this.form.controls[name];
    if ((!this.submitted() && !control.touched) || !control.errors) return '';
    if (control.errors['required']) return this.transloco.translate(ticketRequiredKey(name));
    if (control.errors['maxlength']) {
      return this.transloco.translate('validation.maxLength', {
        max: control.errors['maxlength'].requiredLength,
      });
    }
    return this.transloco.translate('common.invalid');
  }

  onDateInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const formattedValue = formatDateInput(input.value);
    if (input.value !== formattedValue) input.value = formattedValue;

    const date = parseDisplayDate(formattedValue);
    if (date) {
      this.form.controls.deadline.setValue(date);
      this.form.controls.deadline.markAsDirty();
    }
  }

  participantName(participant: { name?: string; surname?: string } | null | undefined): string {
    const unassigned = this.transloco.translate('common.unassigned');
    if (!participant) return unassigned;
    return `${participant.name ?? ''} ${participant.surname ?? ''}`.trim() || unassigned;
  }

  participantInitials(participant: { name?: string; surname?: string } | null | undefined): string {
    if (!participant) return '';

    const initials = `${participant.name?.[0] ?? ''}${participant.surname?.[0] ?? ''}`;
    return initials.toUpperCase() || 'U';
  }

  onDateBlur(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input?.value && !parseDisplayDate(input.value)) {
      this.form.controls.deadline.setValue(null);
    }
  }

  searchMilestones(search: string): void {
    this.milestoneSearchChanges.next(search);
  }

  loadMoreMilestones(event: Event): void {
    event.stopPropagation();
    if (
      !this.projectId ||
      this.milestonesLoading() ||
      !this.milestonesHaveMore() ||
      !this.milestonesNextCursor()
    ) {
      return;
    }

    this.milestonesLoading.set(true);
    this.workGroupsService
      .getMilestones(this.projectId, {
        search: this.milestoneSearch || null,
        cursor: this.milestonesNextCursor(),
        pageSize: 50,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.applyMilestonePage(page.items, page.nextCursor, page.hasMore, true);
          this.milestonesLoading.set(false);
        },
        error: () => {
          this.milestonesLoading.set(false);
          this.snackBar.error(this.transloco.translate('tickets.moreMilestonesFailed'));
        },
      });
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private patchForm(ticket: WorkTicketModel): void {
    this.ensureMilestoneOption({
      id: ticket.milestoneId,
      title: ticket.milestoneTitle,
      groupId: ticket.groupId,
      groupTitle: ticket.groupTitle,
    });
    this.form.patchValue({
      title: ticket.title,
      description: ticket.description ?? '',
      milestoneId: ticket.milestoneId,
      workTicketTypeId: ticket.workTicketType.id,
      priorityId: ticket.priority.id,
      workTicketStatusId: ticket.workTicketStatus.id,
      deadline: ticket.deadline ? new Date(ticket.deadline) : null,
      assigneeId: ticket.assignee?.id ?? null,
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private applyInitialMilestone(): void {
    const requestedMilestoneId = this.route.snapshot.queryParamMap.get('milestoneId');
    const initialMilestone = this.navigationState.milestone;
    if (initialMilestone && initialMilestone.id === requestedMilestoneId) {
      this.ensureMilestoneOption(initialMilestone);
    }

    if (
      requestedMilestoneId &&
      this.milestones().some((item) => item.id === requestedMilestoneId)
    ) {
      this.form.controls.milestoneId.setValue(requestedMilestoneId);
      this.form.markAsPristine();
    }
  }

  private applyMilestonePage(
    items: MilestoneOptionModel[],
    nextCursor: string | null,
    hasMore: boolean,
    append: boolean,
  ): void {
    const selectedId = this.form.controls.milestoneId.value;
    const selected = this.milestones().find((item) => item.id === selectedId);
    const options = items.map(toMilestoneOption);
    const merged = append
      ? [...this.milestones(), ...options]
      : selected
        ? [selected, ...options]
        : options;

    this.milestones.set(uniqueMilestones(merged));
    this.milestonesNextCursor.set(nextCursor);
    this.milestonesHaveMore.set(hasMore);
  }

  private ensureMilestoneOption(item: MilestoneOptionModel): void {
    this.milestones.update((items) => uniqueMilestones([toMilestoneOption(item), ...items]));
  }

  private createCommand(): CreateWorkTicketCommand | null {
    const value = this.form.getRawValue();
    if (
      value.milestoneId === null ||
      value.workTicketTypeId === null ||
      value.priorityId === null
    ) {
      return null;
    }

    return {
      title: (value.title ?? '').trim(),
      description: (value.description ?? '').trim() || null,
      milestoneId: value.milestoneId,
      workTicketTypeId: value.workTicketTypeId,
      priorityId: value.priorityId,
      deadline: value.deadline?.toISOString() ?? null,
      assigneeId: value.assigneeId,
    };
  }

  private navigateBack(): void {
    void this.router.navigateByUrl(this.returnUrl);
  }
}

function ticketRequiredKey(name: string): string {
  return (
    {
      title: 'tickets.nameRequired',
      milestoneId: 'tickets.milestoneRequired',
      workTicketTypeId: 'projects.typeRequired',
      priorityId: 'tasks.priorityRequired',
      workTicketStatusId: 'projects.statusRequired',
    } as Record<string, string>
  )[name];
}

function ticketErrorMessage(error: WorkItemMutationError, transloco: TranslocoService): string {
  if (error.status === 429) return error.message ?? transloco.translate('errors.tooManyRequests');
  if (error.message) return error.message;
  if (error.status === 403) return transloco.translate('tickets.editDenied');
  if (error.status === 404) return transloco.translate('tickets.missing');
  return transloco.translate('tickets.saveFailed');
}
