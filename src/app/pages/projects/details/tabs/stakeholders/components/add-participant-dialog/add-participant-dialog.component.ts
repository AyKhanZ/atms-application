import { LabelForDirective } from '../../../../../../../core/directives/label-for.directive';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Select, SelectFilterEvent, SelectModule } from 'primeng/select';
import {
  InviteWorkProjectParticipantCommand,
  WorkProjectParticipantCommand,
  WorkProjectRoleModel,
} from '../../../../../../../core/models/work-projects';
import { ParticipantCandidate } from '../../participant-candidate.model';
import { InviteField, InviteServerError } from '../../invite-server-error.model';
import { availableParticipantRoles } from '../../participant-role.utils';
import { ProfileAvatarComponent } from '../../../../../../../shared/components/profile-avatar/profile-avatar.component';
import {
  PersonInitialsPipe,
  PersonNamePipe,
} from '../../../../../../../shared/pipes/person-name.pipe';

type DialogMode = 'search' | 'invite';

const notBlank = /\S/;

interface InviteFieldDefinition {
  key: InviteField;
  id: string;
  label: string;
  maxLength: number;
}

// same order and limits as registering a user
const inviteFields: InviteFieldDefinition[] = [
  { key: 'name', id: 'inviteName', label: 'Name', maxLength: 50 },
  { key: 'surname', id: 'inviteSurname', label: 'Surname', maxLength: 100 },
  { key: 'email', id: 'inviteEmail', label: 'Email', maxLength: 100 },
];

@Component({
  selector: 'app-add-participant-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    LabelForDirective,
    ProfileAvatarComponent,
    PersonNamePipe,
    PersonInitialsPipe,
  ],
  templateUrl: './add-participant-dialog.component.html',
  styleUrl: './add-participant-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddParticipantDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userSelect = viewChild<Select>('userSelect');

  readonly visible = model(false);
  readonly users = input<ParticipantCandidate[]>([]);
  readonly roles = input<WorkProjectRoleModel[]>([]);
  readonly isSaving = input(false);
  readonly canInviteByEmail = input(false);
  // shown under the field the server named
  readonly inviteError = input<InviteServerError | null>(null);
  // refused here before a request the server would refuse anyway
  readonly participantEmails = input<string[]>([]);
  readonly invitedEmails = input<string[]>([]);
  // of 20, shown only when one or two are left
  readonly placesLeft = input<number | null>(null);
  readonly submitted = output<WorkProjectParticipantCommand>();
  readonly invited = output<InviteWorkProjectParticipantCommand>();
  readonly selectedUserId = signal('');
  readonly submitAttempted = signal(false);
  readonly mode = signal<DialogMode>('search');
  readonly searchText = signal('');
  readonly inviteAttempted = signal(false);
  readonly inviteErrorVisible = signal(false);
  readonly inviteFields = inviteFields;

  readonly form = this.fb.nonNullable.group({
    userId: ['', Validators.required],
    roleId: [{ value: '', disabled: true }, Validators.required],
  });

  readonly inviteForm = this.fb.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(100),
        (control: AbstractControl<string>) =>
          this.takenEmailMessage(control.value) ? { taken: true } : null,
      ],
    ],
    name: ['', [Validators.required, Validators.pattern(notBlank), Validators.maxLength(50)]],
    surname: ['', [Validators.required, Validators.pattern(notBlank), Validators.maxLength(100)]],
  });

  readonly header = computed(() =>
    this.mode() === 'invite' ? 'Invite to project' : 'Add participant',
  );
  readonly searchedEmail = computed(() => {
    const text = this.searchText().trim();

    return text.includes('@') && Validators.email(new FormControl(text)) === null ? text : '';
  });
  readonly searchedEmailTaken = computed(() => this.takenEmailMessage(this.searchedEmail()));
  readonly placesLeftNote = computed(() => {
    const left = this.placesLeft();

    if (left === null || left < 1 || left > 2) return '';
    return left === 1 ? '1 place left' : `${left} places left`;
  });

  readonly availableRoles = computed(() => {
    const user = this.users().find((candidate) => candidate.id === this.selectedUserId());

    return user ? availableParticipantRoles(this.roles(), user.side) : [];
  });

  constructor() {
    this.form.controls.userId.valueChanges.pipe(takeUntilDestroyed()).subscribe((userId) => {
      this.selectedUserId.set(userId);
      this.form.controls.roleId.reset('');

      if (userId) this.form.controls.roleId.enable();
      else this.form.controls.roleId.disable();
    });

    // refusal stays until the user changes something
    this.inviteForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.inviteErrorVisible.set(false));

    effect(() => {
      const visible = this.visible();

      if (visible) untracked(() => this.resetForm());
    });

    effect(() => {
      const error = this.inviteError();

      untracked(() => this.inviteErrorVisible.set(!!error));
    });
  }

  showError(controlName: 'userId' | 'roleId'): boolean {
    const control = this.form.controls[controlName];

    return this.submitAttempted() && control.invalid;
  }

  inviteFieldError(field: InviteField): string {
    const serverError = this.inviteError();
    if (this.inviteErrorVisible() && serverError?.field === field) return serverError.message;

    const control = this.inviteForm.controls[field];
    // shown at once, the person is already in the list behind the dialog
    if (control.hasError('taken')) return this.takenEmailMessage(control.value) ?? '';
    if (!this.inviteAttempted() || control.valid) return '';

    if (control.hasError('required') || control.hasError('pattern')) {
      return `Enter ${field === 'email' ? 'an' : 'a'} ${field}.`;
    }
    if (control.hasError('email')) return 'Enter a valid email.';

    const maxLength = control.getError('maxlength')?.requiredLength as number | undefined;
    const label = inviteFields.find((definition) => definition.key === field)?.label;
    return maxLength ? `${label} must be at most ${maxLength} characters.` : '';
  }

  takenEmailMessage(email: string): string | null {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return null;

    const isIn = (emails: string[]) => emails.some((item) => item.toLowerCase() === normalized);
    if (isIn(this.participantEmails()))
      return 'This person is already a participant of this project.';
    if (isIn(this.invitedEmails())) return 'This email has already been invited to this project.';
    return null;
  }

  inviteLength(field: InviteField): number {
    return this.inviteForm.controls[field].value.length;
  }

  updateVisible(visible: boolean): void {
    this.visible.set(visible);
  }

  close(): void {
    this.visible.set(false);
  }

  onSearch(event: SelectFilterEvent): void {
    this.searchText.set(event.filter ?? '');
  }

  openInvite(email: string): void {
    // close the search list before switching, on a phone it stays open as a sheet over the form
    this.userSelect()?.hide();
    this.inviteForm.reset({ email, name: '', surname: '' });
    this.inviteAttempted.set(false);
    this.inviteErrorVisible.set(false);
    this.mode.set('invite');
    setTimeout(() => document.getElementById('inviteName')?.focus());
  }

  backToSearch(): void {
    // leaving while saving would hide the server refusal
    if (this.isSaving()) return;

    this.mode.set('search');
  }

  submit(): void {
    if (this.isSaving()) return;

    if (this.form.invalid) {
      this.submitAttempted.set(true);
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.getRawValue());
  }

  submitInvite(): void {
    if (this.isSaving()) return;

    if (this.inviteForm.invalid) {
      this.inviteAttempted.set(true);
      this.inviteForm.markAllAsTouched();
      return;
    }

    const { email, name, surname } = this.inviteForm.getRawValue();
    this.invited.emit({ email: email.trim(), name: name.trim(), surname: surname.trim() });
  }

  private resetForm(): void {
    this.form.reset({ userId: '', roleId: '' });
    this.selectedUserId.set('');
    this.submitAttempted.set(false);
    this.form.controls.roleId.disable();
    this.mode.set('search');
    this.searchText.set('');
    this.inviteForm.reset({ email: '', name: '', surname: '' });
    this.inviteAttempted.set(false);
    this.inviteErrorVisible.set(false);
  }
}
