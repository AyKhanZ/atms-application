import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
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
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { forkJoin } from 'rxjs';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import {
  OrganizationListItemModel,
  OrganizationModel,
} from '../../../../core/models/organizations/organizations.models';
import { WorkProjectModel, WorkProjectRoleModel } from '../../../../core/models/work-projects';
import { DictionaryService } from '../../../../core/services/dictionary.service';
import { OrganizationsService } from '../../../../core/services/organizations.service';
import {
  WorkProjectsStoreActions,
  WorkProjectsStoreSelectors,
} from '../../../../store/work-projects';

@Component({
  selector: 'app-project-form-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './form-dialog.component.html',
  styleUrl: './form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFormDialogComponent {
  readonly maxParticipants = 20;

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly project = input<WorkProjectModel | null>(null);
  readonly types = input.required<DictionaryModel[]>();
  readonly kinds = input.required<DictionaryModel[]>();
  readonly statuses = input.required<DictionaryModel[]>();
  readonly saved = output<void>();
  readonly submitted = signal(false);
  readonly organizations = signal<OrganizationListItemModel[]>([]);
  readonly organization = signal<OrganizationModel | null>(null);
  readonly roles = signal<WorkProjectRoleModel[]>([]);
  readonly isSaving = this.store.selectSignal(WorkProjectsStoreSelectors.isSubmitted);
  readonly isEdit = computed(() => Boolean(this.project()?.id));
  readonly title = computed(() => (this.isEdit() ? 'Edit project' : 'Create project'));

  readonly form = this.fb.group(
    {
      title: ['', [Validators.required, Validators.maxLength(100)]],
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
    effect(() => {
      if (this.visible()) this.open(this.project());
    });
    this.actions$
      .pipe(
        ofType(
          WorkProjectsStoreActions.createProjectSuccess,
          WorkProjectsStoreActions.updateProjectSuccess,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.visible.set(false);
        this.saved.emit();
      });
  }

  addParticipant(userId: string | null = null, roleId: string | null = null): void {
    if (this.participants.length >= this.maxParticipants) return;
    this.participants.push(
      this.fb.group({
        userId: [userId, Validators.required],
        roleId: [roleId, Validators.required],
      }),
    );
  }

  removeParticipant(index: number): void {
    this.participants.removeAt(index);
  }

  organizationChanged(organizationId: string | null): void {
    this.organization.set(null);
    this.participants.clear();
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

  availableUsers(index: number): OrganizationModel['users'] {
    const selected = new Set(
      this.participants.controls
        .map((control, currentIndex) =>
          currentIndex === index ? null : control.get('userId')?.value,
        )
        .filter(Boolean),
    );
    return (this.organization()?.users ?? []).filter((user) => !selected.has(user.id));
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const participants = value.participants as { userId: string | null; roleId: string | null }[];
    const command = {
      title: (value.title ?? '').trim(),
      description: (value.description ?? '').trim() || null,
      organizationId: value.organizationId,
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
    if (this.isEdit())
      this.store.dispatch(
        WorkProjectsStoreActions.updateProject({ command: { ...command, id: this.project()!.id } }),
      );
    else this.store.dispatch(WorkProjectsStoreActions.createProject({ command }));
  }

  close(): void {
    if (!this.isSaving()) this.visible.set(false);
  }
  error(name: 'title' | 'projectTypeId' | 'projectKindId' | 'projectStatusId'): string {
    const control = this.form.controls[name];
    if ((!this.submitted() && !control.touched) || !control.errors) return '';
    if (control.errors['required']) return `${label(name)} is required.`;
    if (control.errors['maxlength'])
      return `Maximum ${control.errors['maxlength'].requiredLength} characters.`;
    return 'Invalid value.';
  }

  participantError(index: number, name: 'userId' | 'roleId'): string {
    const control = this.participants.at(index).get(name);
    if ((!this.submitted() && !control?.touched) || !control?.errors) return '';
    return name === 'userId' ? 'User is required.' : 'Role is required.';
  }

  private open(project: WorkProjectModel | null): void {
    this.submitted.set(false);
    this.organization.set(null);
    this.participants.clear();
    this.form.reset({
      title: project?.title ?? '',
      description: project?.description ?? '',
      organizationId: project?.organization?.id ?? null,
      projectTypeId: project?.projectType.id ?? null,
      projectKindId: project?.projectKind.id ?? null,
      projectStatusId: project?.projectStatus.id ?? null,
      startDate: project?.startDate ? new Date(project.startDate) : null,
      endDate: project?.endDate ? new Date(project.endDate) : null,
    });
    forkJoin({
      organizations: this.organizationsService.getOrganizations({
        page: 1,
        pageSize: 50,
        sortBy: 'title',
        sortDirection: 1,
      }),
      roles: this.dictionaryService.getProjectRoleDictionaries(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ organizations, roles }) => {
        this.organizations.set(organizations.items);
        this.roles.set(roles);
      });
    if (project?.organization?.id) this.loadOrganization(project.organization.id, project);
  }

  private loadOrganization(id: string, project: WorkProjectModel | null = null): void {
    this.organizationsService
      .getOrganization(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((organization) => {
        this.organization.set(organization);
        if (project)
          project.participants.forEach((participant) =>
            this.addParticipant(participant.userId, participant.role.id),
          );
      });
  }
}

function toDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
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
      projectTypeId: 'Project type',
      projectKindId: 'Project kind',
      projectStatusId: 'Project status',
    } as Record<string, string>
  )[name];
}
function projectDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const startDate = control.get('startDate')?.value as Date | null;
  const endDate = control.get('endDate')?.value as Date | null;
  return startDate && endDate && startDate > endDate ? { dateRange: true } : null;
}
