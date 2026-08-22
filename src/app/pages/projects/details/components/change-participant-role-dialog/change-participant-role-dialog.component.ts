import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import {
  WorkProjectParticipantModel,
  WorkProjectRoleModel,
} from '../../../../../core/models/work-projects';
import { availableParticipantRoles } from '../participant-role.utils';

@Component({
  selector: 'app-change-participant-role-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, SelectModule],
  templateUrl: './change-participant-role-dialog.component.html',
  styleUrl: './change-participant-role-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeParticipantRoleDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = model(false);
  readonly participant = input<WorkProjectParticipantModel | null>(null);
  readonly roles = input<WorkProjectRoleModel[]>([]);
  readonly isSaving = input(false);
  readonly submitted = output<string>();

  readonly form = this.fb.nonNullable.group({
    roleId: ['', Validators.required],
  });

  readonly availableRoles = computed(() => {
    const participant = this.participant();
    const side = participant?.category === 'client' ? 'client' : 'team';

    return participant ? availableParticipantRoles(this.roles(), side) : [];
  });

  constructor() {
    effect(() => {
      const participant = this.participant();

      if (this.visible() && participant) {
        this.form.reset({ roleId: participant.role.id });
      }
    });
  }

  fullName(participant: WorkProjectParticipantModel): string {
    return `${participant.name} ${participant.surname}`.trim();
  }

  showError(): boolean {
    return this.form.controls.roleId.invalid && this.form.controls.roleId.touched;
  }

  updateVisible(visible: boolean): void {
    this.visible.set(visible);
  }

  close(): void {
    this.visible.set(false);
  }

  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit(this.form.controls.roleId.value);
  }
}
