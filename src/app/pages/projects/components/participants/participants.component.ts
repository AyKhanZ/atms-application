import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { OrganizationModel } from '../../../../core/models/organizations/organizations.models';
import { projectRoleIds } from '../../../../core/constants/project-role-ids.constants';
import {
  WorkProjectParticipantCandidateModel,
  WorkProjectRoleModel,
} from '../../../../core/models/work-projects';

interface ParticipantUserGroup {
  label: string;
  items: WorkProjectParticipantCandidateModel[];
}

@Component({
  selector: 'app-project-participants',
  imports: [ReactiveFormsModule, ButtonModule, SelectModule],
  templateUrl: './participants.component.html',
  styleUrl: './participants.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectParticipantsComponent {
  readonly participants = input.required<FormArray>();
  readonly organization = input<OrganizationModel | null>(null);
  readonly teamMembers = input.required<WorkProjectParticipantCandidateModel[]>();
  readonly roles = input.required<WorkProjectRoleModel[]>();
  readonly maxParticipants = input.required<number>();
  readonly submitted = input(false);
  readonly participantsRequired = input(false);
  readonly canAddParticipants = input(false);
  readonly highlightedIndex = input<number | null>(null);
  readonly addParticipant = output<void>();
  readonly removeParticipant = output<number>();

  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  availableUserGroups(index: number): ParticipantUserGroup[] {
    const selected = new Set(
      this.participants()
        .controls.map((control, currentIndex) =>
          currentIndex === index ? null : control.get('userId')?.value,
        )
        .filter(Boolean),
    );

    const groups: ParticipantUserGroup[] = [];
    const teamMembers = this.teamMembers().filter((user) => !selected.has(user.id));
    const clientUsers = (this.organization()?.users ?? []).filter((user) => !selected.has(user.id));

    if (teamMembers.length > 0) groups.push({ label: 'Our team', items: teamMembers });
    if (clientUsers.length > 0) {
      groups.push({ label: 'Client organization', items: clientUsers });
    }

    return groups;
  }

  availableRoles(index: number): WorkProjectRoleModel[] {
    const userId = this.participants().at(index).get('userId')?.value as string | null;
    if (!userId) return [];

    const roleIds = this.isClientUser(userId)
      ? [projectRoleIds.clientOrganizationManager, projectRoleIds.clientOrganizationViewer]
      : [
          projectRoleIds.projectManager,
          projectRoleIds.businessConsultant,
          projectRoleIds.developer,
        ];
    const allowedRoleIds = new Set<string>(roleIds);
    return this.roles().filter((role) => allowedRoleIds.has(role.id));
  }

  participantUserChanged(index: number): void {
    const participant = this.participants().at(index);
    const userId = participant.get('userId')?.value as string | null;
    const roleControl = participant.get('roleId');
    roleControl?.reset(null);
    if (userId) roleControl?.enable();
    else roleControl?.disable();
  }

  participantSource(index: number): string {
    const userId = this.participants().at(index).get('userId')?.value as string | null;
    if (!userId) return '';
    return this.isClientUser(userId) ? 'Client organization' : 'Our team';
  }

  error(index: number, name: 'userId' | 'roleId'): string {
    const control = this.participants().at(index).get(name);
    if ((!this.submitted() && !control?.touched) || !control?.errors) return '';
    return name === 'userId' ? 'User is required.' : 'Role is required.';
  }

  participantsError(): string {
    return this.submitted() && this.participants().hasError('required')
      ? 'At least one participant is required.'
      : '';
  }

  private isClientUser(userId: string): boolean {
    return (this.organization()?.users ?? []).some((user) => user.id === userId);
  }
}
