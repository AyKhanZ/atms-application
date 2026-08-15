import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  OnDestroy,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import {
  OrganizationListItemModel,
  OrganizationModel,
} from '../../../../core/models/organizations/organizations.models';
import {
  WorkProjectCommand,
  WorkProjectModel,
  WorkProjectParticipantCandidateModel,
  WorkProjectRoleModel,
} from '../../../../core/models/work-projects';
import { projectRoleIds } from '../../../../core/constants/project-role-ids.constants';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { OrganizationsService } from '../../../../core/services/organizations.service';
import { WorkProjectsService } from '../../../../core/services/work-projects.service';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import {
  WorkProjectsStoreActions,
  WorkProjectsStoreSelectors,
} from '../../../../store/work-projects';
import { ProjectParticipantsComponent } from '../participants/participants.component';

@Component({
  selector: 'app-project-form-page',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    BackButtonComponent,
    ProjectParticipantsComponent,
  ],
  templateUrl: './form-page.component.html',
  styleUrl: './form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFormPageComponent implements OnDestroy {
  readonly mode = input.required<'create' | 'edit'>();

  readonly maxParticipants = 20;

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly workProjectsService = inject(WorkProjectsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitted = signal(false);
  readonly organizations = signal<OrganizationListItemModel[]>([]);
  readonly organization = signal<OrganizationModel | null>(null);
  readonly teamMembers = signal<WorkProjectParticipantCandidateModel[]>([]);
  readonly types = signal<DictionaryModel[]>([]);
  readonly kinds = signal<DictionaryModel[]>([]);
  readonly statuses = signal<DictionaryModel[]>([]);
  readonly roles = signal<WorkProjectRoleModel[]>([]);
  readonly isInternalProject = signal(false);
  readonly requiresOrganization = signal(false);
  readonly canAddParticipants = computed(
    () => this.isInternalProject() || (this.requiresOrganization() && Boolean(this.organization())),
  );
  readonly isSaving = this.store.selectSignal(WorkProjectsStoreSelectors.isSubmitted);
  readonly project = this.store.selectSignal(WorkProjectsStoreSelectors.getItem);
  readonly id = this.route.snapshot.paramMap.get('id');
  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly pageTitle = computed(() => (this.isEdit() ? 'Edit project' : 'Create project'));
  readonly submitLabel = computed(() => (this.isEdit() ? 'Save' : 'Create'));

  readonly form = this.fb.group(
    {
      title: ['', [Validators.required, Validators.maxLength(80)]],
      description: ['', Validators.maxLength(2000)],
      organizationId: [null as string | null],
      projectTypeId: [null as number | null, Validators.required],
      projectKindId: [null as number | null, Validators.required],
      projectStatusId: [null as number | null, Validators.required],
      startDate: [null as Date | null],
      endDate: [null as Date | null],
      participants: this.fb.array([]),
    },
    { validators: projectDateRangeValidator },
  );

  get participants(): FormArray {
    return this.form.controls.participants;
  }

  constructor() {
    if (this.id) this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id }));

    this.form.controls.projectKindId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((projectKindId) => this.applyProjectKind(projectKindId));

    forkJoin({
      organizations: this.organizationsService.getOrganizations({
        page: 1,
        pageSize: 50,
        sortBy: 'title',
        sortDirection: 1,
      }),
      types: this.dictionaryService.getProjectTypeDictionaries(),
      kinds: this.dictionaryService.getProjectKindDictionaries(),
      statuses: this.dictionaryService.getProjectStatusDictionaries(),
      roles: this.dictionaryService.getProjectRoleDictionaries(),
      teamMembers: this.workProjectsService.getTeamMembers(),
    })
      .pipe(takeUntilDestroyed())
      .subscribe(({ organizations, types, kinds, statuses, roles, teamMembers }) => {
        this.organizations.set(organizations.items);
        this.types.set(types);
        this.kinds.set(kinds);
        this.statuses.set(statuses);
        this.roles.set(roles);
        this.teamMembers.set(teamMembers);
        this.applyProjectKind(this.form.controls.projectKindId.value);
      });

    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.createProjectSuccess), takeUntilDestroyed())
      .subscribe(({ id }) => {
        void this.router.navigate(['/projects', id], { state: { returnUrl: '/projects' } });
      });

    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.loadProjectSuccess), takeUntilDestroyed())
      .subscribe(({ item }) => {
        if (item.id === this.id) this.patchForm(item);
      });

    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.updateProjectSuccess), takeUntilDestroyed())
      .subscribe(() => {
        if (this.id)
          void this.router.navigate(['/projects', this.id], { state: { returnUrl: '/projects' } });
      });
  }

  ngOnDestroy(): void {
    this.store.dispatch(WorkProjectsStoreActions.clearItem());
  }

  addParticipant(userId: string | null = null, roleId: string | null = null): void {
    if (this.participants.length >= this.maxParticipants) return;
    this.participants.push(
      this.fb.group({
        userId: [userId, Validators.required],
        roleId: [{ value: roleId, disabled: !userId }, Validators.required],
      }),
    );
  }

  removeParticipant(index: number): void {
    this.participants.removeAt(index);
  }

  organizationChanged(organizationId: string | null): void {
    this.removeClientParticipants();
    this.organization.set(null);
    if (!organizationId) return;
    this.loadOrganization(organizationId);
  }

  onDateInput(event: Event, controlName: 'startDate' | 'endDate'): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const formattedValue = formatDateInput(input.value);
    if (input.value !== formattedValue) input.value = formattedValue;

    const date = parseDisplayDate(formattedValue);
    if (date) {
      this.form.controls[controlName].setValue(date);
      this.form.controls[controlName].markAsDirty();
    }
  }

  onDateBlur(event: Event, controlName: 'startDate' | 'endDate'): void {
    const input = event.target as HTMLInputElement | null;
    if (!input?.value) return;

    if (!parseDisplayDate(input.value)) this.form.controls[controlName].setValue(null);
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const command = this.createCommand();
    if (this.id) {
      this.store.dispatch(
        WorkProjectsStoreActions.updateProject({ command: { ...command, id: this.id } }),
      );
      return;
    }

    this.store.dispatch(WorkProjectsStoreActions.createProject({ command }));
  }

  cancel(): void {
    void this.router.navigate(['/projects']);
  }

  error(
    name: 'title' | 'organizationId' | 'projectTypeId' | 'projectKindId' | 'projectStatusId',
  ): string {
    const control = this.form.controls[name];
    if ((!this.submitted() && !control.touched) || !control.errors) return '';
    if (control.errors['required']) return `${label(name)} is required.`;
    if (control.errors['maxlength'])
      return `Maximum ${control.errors['maxlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }

  private patchForm(project: WorkProjectModel): void {
    this.form.patchValue({
      title: project.title,
      description: project.description || '',
      organizationId: project.organization?.id || null,
      projectTypeId: project.projectType.id,
      projectKindId: project.projectKind.id,
      projectStatusId: project.projectStatus.id,
      startDate: toNullableDate(project.startDate),
      endDate: toNullableDate(project.endDate),
    });

    this.participants.clear();
    project.participants.forEach((participant) =>
      this.addParticipant(participant.userId, participant.role.id),
    );
    if (project.organization?.id) this.loadOrganization(project.organization.id);
  }

  private loadOrganization(organizationId: string): void {
    this.organizationsService
      .getOrganization(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((organization) => {
        if (this.form.controls.organizationId.value === organizationId) {
          this.organization.set(organization);
        }
      });
  }

  private applyProjectKind(projectKindId: number | null): void {
    const projectKind = this.kinds().find((kind) => kind.id === projectKindId);
    const isInternal = projectKind?.code.toLowerCase() === 'internal';
    const requiresOrganization = Boolean(projectKind) && !isInternal;
    this.isInternalProject.set(isInternal);
    this.requiresOrganization.set(requiresOrganization);

    const organizationControl = this.form.controls.organizationId;
    const participantsControl = this.form.controls.participants;
    organizationControl.setValidators(requiresOrganization ? Validators.required : null);
    participantsControl.setValidators(requiresOrganization ? Validators.required : null);
    organizationControl.updateValueAndValidity({ emitEvent: false });
    participantsControl.updateValueAndValidity({ emitEvent: false });

    if (!isInternal) return;

    organizationControl.setValue(null, { emitEvent: false });
    this.organizationChanged(null);
  }

  private removeClientParticipants(): void {
    const clientUserIds = new Set((this.organization()?.users ?? []).map((user) => user.id));
    const clientRoleIds = new Set<string>([
      projectRoleIds.clientOrganizationManager,
      projectRoleIds.clientOrganizationViewer,
    ]);

    for (let index = this.participants.length - 1; index >= 0; index -= 1) {
      const participant = this.participants.at(index);
      const userId = participant.get('userId')?.value as string | null;
      const roleId = participant.get('roleId')?.value as string | null;
      if ((userId && clientUserIds.has(userId)) || (roleId && clientRoleIds.has(roleId))) {
        this.participants.removeAt(index);
      }
    }
  }

  private createCommand(): WorkProjectCommand {
    const value = this.form.getRawValue();
    const participants = value.participants as { userId: string | null; roleId: string | null }[];
    return {
      title: (value.title ?? '').trim(),
      description: (value.description ?? '').trim() || null,
      organizationId: this.isInternalProject() ? null : value.organizationId,
      projectTypeId: value.projectTypeId!,
      projectKindId: value.projectKindId!,
      projectStatusId: value.projectStatusId!,
      startDate: toDate(value.startDate),
      endDate: toDate(value.endDate),
      participants: participants.map((participant) => ({
        userId: participant.userId!,
        roleId: participant.roleId!,
      })),
    };
  }
}

function toDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toNullableDate(value?: string | null): Date | null {
  return value ? new Date(value) : null;
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

function label(name: string): string {
  return (
    {
      title: 'Title',
      organizationId: 'Organization',
      projectTypeId: 'Type',
      projectKindId: 'Kind',
      projectStatusId: 'Status',
    } as Record<string, string>
  )[name];
}

function projectDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value as Date | null;
  const endDate = control.get('endDate')?.value as Date | null;
  return startDate && endDate && startDate > endDate ? { dateRange: true } : null;
}
