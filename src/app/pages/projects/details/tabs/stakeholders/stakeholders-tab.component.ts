import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Menu, MenuModule } from 'primeng/menu';
import { forkJoin, of } from 'rxjs';
import { ProjectPermissions } from '../../../../../core/enums/project-permissions.enum';
import {
  OrganizationModel,
  OrganizationUserModel,
} from '../../../../../core/models/organizations/organization.model';
import {
  WorkProjectModel,
  WorkProjectParticipantCandidateModel,
  WorkProjectParticipantCommand,
  WorkProjectParticipantModel,
  WorkProjectRoleModel,
} from '../../../../../core/models/work-projects';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { ImageUrlService } from '../../../../../core/services/image-url.service';
import { OrganizationsService } from '../../../../../core/services/organizations.service';
import { ProjectAccessService } from '../../../../../core/services/project-access.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { WorkProjectsStoreActions } from '../../../../../store/work-projects';
import { AddParticipantDialogComponent } from './components/add-participant-dialog/add-participant-dialog.component';
import { ChangeParticipantRoleDialogComponent } from './components/change-participant-role-dialog/change-participant-role-dialog.component';
import { ParticipantCandidate, ParticipantSide } from './participant-candidate.model';

@Component({
  selector: 'app-stakeholders-tab',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    MenuModule,
    RouterLink,
    ProfileAvatarComponent,
    AddParticipantDialogComponent,
    ChangeParticipantRoleDialogComponent,
  ],
  templateUrl: './stakeholders-tab.component.html',
  styleUrl: './stakeholders-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StakeholdersTabComponent {
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly workProjectsService = inject(WorkProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly project = input.required<WorkProjectModel>();
  readonly isSaving = input(false);
  readonly ProjectPermissions = ProjectPermissions;
  readonly projectReturnUrl = this.router.url;

  readonly roles = signal<WorkProjectRoleModel[]>([]);
  readonly projectPermissions = signal<string[]>([]);
  readonly teamMembers = signal<ParticipantCandidate[]>([]);
  readonly clientUsers = signal<ParticipantCandidate[]>([]);
  readonly selectedParticipant = signal<WorkProjectParticipantModel | null>(null);
  readonly addDialogVisible = signal(false);
  readonly roleDialogVisible = signal(false);

  readonly participantsCount = computed(() => this.project().participants.length);
  readonly canInviteClient = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.InviteClient),
  );
  readonly canInviteEmployee = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.InviteEmployee),
  );
  readonly canInvite = computed(() => this.canInviteClient() || this.canInviteEmployee());
  readonly canEditParticipants = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.Edit),
  );
  readonly canDeleteParticipants = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.Delete),
  );
  readonly canManageParticipants = computed(
    () => this.canEditParticipants() || this.canDeleteParticipants(),
  );
  readonly availableUsers = computed(() => {
    const selectedUserIds = new Set(
      this.project().participants.map((participant) => participant.userId),
    );

    const candidates = [
      ...(this.canInviteClient() ? this.clientUsers() : []),
      ...(this.canInviteEmployee() ? this.teamMembers() : []),
    ];
    return candidates.filter(
      (user) => !selectedUserIds.has(user.id),
    );
  });
  readonly participantActions = computed<MenuItem[]>(() => {
    const actions: MenuItem[] = [];
    if (this.canEditParticipants()) {
      actions.push({
        label: 'Change role',
        icon: 'pi pi-pencil',
        command: () => {
          const participant = this.selectedParticipant();
          if (participant) this.openRoleDialog(participant);
        },
      });
    }
    if (this.canDeleteParticipants()) {
      actions.push({
        label: 'Remove',
        icon: 'pi pi-trash',
        styleClass: 'participant-menu-danger',
        command: () => {
          const participant = this.selectedParticipant();
          if (participant) this.confirmRemove(participant);
        },
      });
    }
    return actions;
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.projectAccess
        .getPermissions(this.project().id)
        .subscribe((permissions) => this.projectPermissions.set(permissions));
      onCleanup(() => subscription.unsubscribe());
    });
  }

  fullName(participant: WorkProjectParticipantModel): string {
    return `${participant.name} ${participant.surname}`.trim();
  }

  initials(participant: WorkProjectParticipantModel): string {
    const initials = `${participant.name?.[0] ?? ''}${participant.surname?.[0] ?? ''}`;

    return initials.toUpperCase() || 'U';
  }

  organizationInitials(title: string): string {
    return title
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  logoUrl(value?: string | null): string | null {
    return this.imageUrlService.normalize(value);
  }

  isInternal(): boolean {
    return this.project().projectKind.code.toLowerCase() === 'internal';
  }

  openAddDialog(): void {
    if (!this.canInvite() || this.participantsCount() >= 20) return;

    this.loadDialogData(() => this.addDialogVisible.set(true));
  }

  openParticipantMenu(event: Event, participant: WorkProjectParticipantModel, menu: Menu): void {
    this.selectedParticipant.set(participant);
    menu.toggle(event);
  }

  openRoleDialog(participant: WorkProjectParticipantModel): void {
    this.loadDialogData(() => {
      this.selectedParticipant.set(participant);
      this.roleDialogVisible.set(true);
    });
  }

  submitAdd(command: WorkProjectParticipantCommand): void {
    this.store.dispatch(
      WorkProjectsStoreActions.addProjectParticipant({
        id: this.project().id,
        userId: command.userId,
        roleId: command.roleId,
      }),
    );
    this.addDialogVisible.set(false);
  }

  submitRole(roleId: string): void {
    const participant = this.selectedParticipant();
    if (!participant) return;

    this.store.dispatch(
      WorkProjectsStoreActions.updateProjectParticipant({
        id: this.project().id,
        participantId: participant.id,
        roleId,
      }),
    );
    this.roleDialogVisible.set(false);
  }

  confirmRemove(participant: WorkProjectParticipantModel): void {
    this.confirmation.confirm({
      key: 'projectParticipantDanger',
      header: 'Remove participant',
      message: `Remove ${this.fullName(participant)} from this project?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger participant-danger-confirm-button',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.store.dispatch(
          WorkProjectsStoreActions.deleteProjectParticipant({
            id: this.project().id,
            participantId: participant.id,
          }),
        );
      },
    });
  }

  private loadDialogData(complete: () => void): void {
    const project = this.project();

    forkJoin({
      roles: this.dictionaryService.getProjectRoleDictionaries(),
      teamMembers: this.workProjectsService.getTeamMembers(),
      organization:
        !this.isInternal() && project.organization?.id
          ? this.organizationsService.getOrganization(project.organization.id)
          : of(null as OrganizationModel | null),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ roles, teamMembers, organization }) => {
        this.roles.set(roles);
        this.teamMembers.set(teamMembers.map((user) => toParticipantCandidate(user, 'team')));
        this.clientUsers.set(
          (organization?.users ?? []).map((user) => toParticipantCandidate(user, 'client')),
        );
        complete();
      });
  }
}

function toParticipantCandidate(
  user: WorkProjectParticipantCandidateModel | OrganizationUserModel,
  side: ParticipantSide,
): ParticipantCandidate {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    side,
  };
}
