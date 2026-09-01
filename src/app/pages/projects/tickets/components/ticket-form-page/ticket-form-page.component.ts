import { HttpErrorResponse } from '@angular/common/http';
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
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
import { WorkGroupsService } from '../../../../../core/services/work-groups.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import { projectNavigationUrl } from '../../../../../core/utils/project-navigation.utils';
import { BackButtonComponent } from '../../../../../shared/components/back-button/back-button.component';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import {
  MilestoneOption,
  groupMilestones,
  toMilestoneOption,
  uniqueMilestones,
} from './ticket-milestone-options';

interface TicketFormNavigationState {
  milestone?: MilestoneOptionModel;
  /** Where the user was before opening this form, so Back and Save return them there. */
  returnUrl?: unknown;
}

@Component({
  selector: 'app-ticket-form-page',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    BackButtonComponent,
    ProfileAvatarComponent,
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
  private readonly workProjectsService = inject(WorkProjectsService);
  private readonly workGroupsService = inject(WorkGroupsService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
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
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly project = signal<WorkProjectModel | null>(null);
  readonly ticket = signal<WorkTicketModel | null>(null);
  readonly milestones = signal<MilestoneOption[]>([]);
  readonly milestonesLoading = signal(false);
  readonly milestonesHaveMore = signal(false);
  readonly milestonesNextCursor = signal<string | null>(null);
  readonly ticketTypes = signal<DictionaryModel[]>([]);
  readonly priorities = signal<DictionaryModel[]>([]);
  readonly ticketStatuses = signal<DictionaryModel[]>([]);
  readonly milestoneGroups = computed(() => groupMilestones(this.milestones()));
  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly pageTitle = computed(() => (this.isEdit() ? 'Edit ticket' : 'Create ticket'));
  readonly submitLabel = computed(() => (this.isEdit() ? 'Save' : 'Create'));
  /**
   * Where Back, Cancel and a successful Save land. Honours the caller's `returnUrl` so opening
   * the form from a ticket returns to that ticket instead of dumping the user in the Plan tab;
   * falls back to the Plan for direct hits on the URL, where there is nothing to return to.
   */
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
      this.loadError.set('The ticket route is invalid. Return to the project plan and try again.');
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
                this.snackBar.error("We couldn't load milestones. Please try again.");
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
          this.loadError.set(
            "We couldn't load the ticket form. Return to the project plan and try again.",
          );
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
    let request: Observable<unknown>;
    if (this.ticketId) {
      if (statusId === null) {
        this.form.controls.workTicketStatusId.markAsTouched();
        return;
      }

      request = this.workTicketsService.updateWorkTicket(this.projectId, this.ticketId, {
          ...createCommand,
          workTicketStatusId: statusId,
        } satisfies UpdateWorkTicketCommand);
    } else {
      request = this.workTicketsService.createWorkTicket(this.projectId, createCommand);
    }

    this.saving.set(true);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.navigationComplete = true;
          this.snackBar.success(this.ticketId ? 'Ticket changes saved.' : 'Ticket created.');
          this.navigateBack();
        },
        error: (error: HttpErrorResponse) => this.snackBar.error(ticketErrorMessage(error)),
      });
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
        header: 'Discard changes',
        message: 'You have unsaved ticket changes. Leave this page without saving?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Leave',
        rejectLabel: 'Stay',
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
    if (control.errors['required']) return `${ticketFieldLabel(name)} is required.`;
    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} characters.`;
    }
    return 'Invalid value.';
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
    if (!participant) return 'Unassigned';
    return `${participant.name ?? ''} ${participant.surname ?? ''}`.trim() || 'Unassigned';
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
          this.snackBar.error("We couldn't load more milestones. Please try again.");
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

    if (requestedMilestoneId && this.milestones().some((item) => item.id === requestedMilestoneId)) {
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
    const merged = append ? [...this.milestones(), ...options] : selected ? [selected, ...options] : options;

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

function ticketFieldLabel(name: string): string {
  return (
    {
      title: 'Name',
      milestoneId: 'Milestone',
      workTicketTypeId: 'Type',
      priorityId: 'Priority',
      workTicketStatusId: 'Status',
    } as Record<string, string>
  )[name];
}

function ticketErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 400) {
    const errors = error.error?.errors as { error?: string }[] | undefined;
    const message = errors?.find((item) => item.error)?.error;
    if (message) return message;
  }
  if (error.status === 403) return 'You no longer have permission to edit tickets in this project.';
  if (error.status === 404) return 'The ticket or selected milestone is no longer available. Refresh the plan.';
  return "We couldn't save the ticket. Please try again.";
}

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function parseDisplayDate(value: string): Date | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}
