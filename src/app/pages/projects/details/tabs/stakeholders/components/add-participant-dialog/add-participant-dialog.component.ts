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
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import {
  WorkProjectParticipantCommand,
  WorkProjectRoleModel,
} from '../../../../../../../core/models/work-projects';
import { ParticipantCandidate } from '../../participant-candidate.model';
import { availableParticipantRoles } from '../../participant-role.utils';
import { ProfileAvatarComponent } from '../../../../../../../shared/components/profile-avatar/profile-avatar.component';
import {
  PersonInitialsPipe,
  PersonNamePipe,
} from '../../../../../../../shared/pipes/person-name.pipe';

@Component({
  selector: 'app-add-participant-dialog',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
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

  readonly visible = model(false);
  readonly users = input<ParticipantCandidate[]>([]);
  readonly roles = input<WorkProjectRoleModel[]>([]);
  readonly isSaving = input(false);
  readonly submitted = output<WorkProjectParticipantCommand>();
  readonly selectedUserId = signal('');
  readonly submitAttempted = signal(false);

  readonly form = this.fb.nonNullable.group({
    userId: ['', Validators.required],
    roleId: [{ value: '', disabled: true }, Validators.required],
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

    effect(() => {
      const visible = this.visible();

      if (visible) untracked(() => this.resetForm());
    });
  }

  showError(controlName: 'userId' | 'roleId'): boolean {
    const control = this.form.controls[controlName];

    return this.submitAttempted() && control.invalid;
  }

  updateVisible(visible: boolean): void {
    this.visible.set(visible);
  }

  close(): void {
    this.visible.set(false);
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

  private resetForm(): void {
    this.form.reset({ userId: '', roleId: '' });
    this.selectedUserId.set('');
    this.submitAttempted.set(false);
    this.form.controls.roleId.disable();
  }
}
