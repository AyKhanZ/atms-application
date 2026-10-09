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
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { maxProjectParticipants } from '../../../../../core/constants/project-participants.constants';
import { currentLanguage } from '../../../../../core/i18n/active-language';
import { ProjectPermissions } from '../../../../../core/enums/project-permissions.enum';
import {
  InviteWorkProjectParticipantCommand,
  WorkProjectInvitationModel,
  WorkProjectModel,
  WorkProjectParticipantCommand,
  WorkProjectParticipantModel,
  WorkProjectRoleModel,
} from '../../../../../core/models/work-projects';
import { ProjectAccessService } from '../../../../../core/services/project-access.service';
import { personFullName } from '../../../../../core/utils/person-name.utils';
import { WorkProjectsStoreActions } from '../../../../../store/work-projects';
import { OrganizationLogoComponent } from '../../../../../shared/components/organization-logo/organization-logo.component';
import { AddParticipantDialogComponent } from './components/add-participant-dialog/add-participant-dialog.component';
import { ChangeParticipantRoleDialogComponent } from './components/change-participant-role-dialog/change-participant-role-dialog.component';
import { ParticipantListComponent } from './components/participant-list/participant-list.component';
import { ParticipantCandidate } from './participant-candidate.model';
import { ParticipantDialogDataService } from './participant-dialog-data.service';
import { InviteField, InviteServerError } from './invite-server-error.model';

// server field names, anything else goes under email
const inviteFieldsByServerName: Partial<Record<string, InviteField>> = {
  email: 'email',
  name: 'name',
  surname: 'surname',
};

@Component({
  selector: 'app-stakeholders-tab',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    TranslocoDirective,
    TooltipModule,
    RouterLink,
    AddParticipantDialogComponent,
    ChangeParticipantRoleDialogComponent,
    OrganizationLogoComponent,
    ParticipantListComponent,
  ],
  templateUrl: './stakeholders-tab.component.html',
  styleUrl: './stakeholders-tab.component.scss',
  providers: [ParticipantDialogDataService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StakeholdersTabComponent {
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dialogData = inject(ParticipantDialogDataService);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly project = input.required<WorkProjectModel>();
  readonly isSaving = input(false);
  readonly maxParticipants = maxProjectParticipants;
  // read when shown, so a language change does not keep the English sentence
  readonly limitTooltip = computed(() => {
    currentLanguage();
    return this.transloco.translate('participants.limit', { max: maxProjectParticipants });
  });
  readonly projectReturnUrl = this.router.url;

  readonly roles = signal<WorkProjectRoleModel[]>([]);
  readonly projectPermissions = signal<string[]>([]);
  readonly teamMembers = signal<ParticipantCandidate[]>([]);
  readonly clientUsers = signal<ParticipantCandidate[]>([]);
  readonly selectedParticipant = signal<WorkProjectParticipantModel | null>(null);
  readonly addDialogVisible = signal(false);
  readonly roleDialogVisible = signal(false);
  readonly inviteError = signal<InviteServerError | null>(null);

  // pending invitations take a place too
  readonly participantsCount = computed(
    () => this.project().participants.length + this.project().invitations.length,
  );
  readonly placesLeft = computed(() =>
    Math.max(0, this.maxParticipants - this.participantsCount()),
  );
  readonly limitReached = computed(() => this.placesLeft() === 0);
  readonly canInviteClient = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.InviteClient),
  );
  readonly canInviteEmployee = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.InviteEmployee),
  );
  readonly canInvite = computed(() => this.canInviteClient() || this.canInviteEmployee());
  readonly canInviteByEmail = computed(
    () => this.canInviteClient() && !this.isInternal() && !!this.project().organization,
  );
  readonly canEditParticipants = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.Edit),
  );
  readonly canDeleteParticipants = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.Delete),
  );
  readonly canDeleteClients = computed(() =>
    this.projectPermissions().includes(ProjectPermissions.Participant.DeleteClient),
  );
  // client manager removes only clients, pm removes anyone; server checks the same
  readonly removableParticipantIds = computed(
    () =>
      new Set(
        this.project()
          .participants.filter(
            (participant) =>
              this.canDeleteParticipants() ||
              (this.canDeleteClients() && participant.category === 'client'),
          )
          .map((participant) => participant.id),
      ),
  );
  // answered here, the people are already on screen
  readonly participantEmails = computed(() =>
    this.project().participants.map((participant) => participant.email),
  );
  readonly invitedEmails = computed(() =>
    this.project().invitations.map((invitation) => invitation.email),
  );
  readonly availableUsers = computed(() => {
    const selectedUserIds = new Set(
      this.project().participants.map((participant) => participant.userId),
    );

    const candidates = [
      ...(this.canInviteClient() ? this.clientUsers() : []),
      ...(this.canInviteEmployee() ? this.teamMembers() : []),
    ];
    return candidates.filter((user) => !selectedUserIds.has(user.id));
  });

  constructor() {
    effect((onCleanup) => {
      const subscription = this.projectAccess
        .getPermissions(this.project().id)
        .subscribe((permissions) => this.projectPermissions.set(permissions));
      onCleanup(() => subscription.unsubscribe());
    });

    // invite form stays open until the server answers so a refused email can be fixed
    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.inviteProjectParticipantSuccess), takeUntilDestroyed())
      .subscribe(() => this.addDialogVisible.set(false));
    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.inviteProjectParticipantFailure), takeUntilDestroyed())
      .subscribe(({ error, field }) =>
        this.inviteError.set(
          error.message
            ? {
                field: inviteFieldsByServerName[field?.toLowerCase() ?? ''] ?? 'email',
                message: error.message,
              }
            : null,
        ),
      );
  }

  isInternal(): boolean {
    return this.project().projectKind.code.toLowerCase() === 'internal';
  }

  openAddDialog(): void {
    if (!this.canInvite() || this.limitReached()) return;

    this.inviteError.set(null);

    this.loadDialogData(() => this.addDialogVisible.set(true));
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

  submitInvite(command: InviteWorkProjectParticipantCommand): void {
    this.inviteError.set(null);
    this.store.dispatch(
      WorkProjectsStoreActions.inviteProjectParticipant({ id: this.project().id, command }),
    );
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
      header: this.transloco.translate('participants.removeTitle'),
      message: this.transloco.translate('participants.removeNamed', {
        name: personFullName(participant),
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('common.remove'),
      rejectLabel: this.transloco.translate('common.cancel'),
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

  confirmCancelInvitation(invitation: WorkProjectInvitationModel): void {
    this.confirmation.confirm({
      key: 'projectParticipantDanger',
      header: this.transloco.translate('participants.cancelInvitationTitle'),
      message: this.transloco.translate('participants.cancelInvitationMessage', {
        email: invitation.email,
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('participants.cancelInvitation'),
      rejectLabel: this.transloco.translate('common.keep'),
      acceptButtonStyleClass: 'p-button-danger participant-danger-confirm-button',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.store.dispatch(
          WorkProjectsStoreActions.cancelProjectInvitation({
            id: this.project().id,
            invitationId: invitation.id,
          }),
        );
      },
    });
  }

  private loadDialogData(complete: () => void): void {
    this.dialogData
      .load(this.project(), this.isInternal())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ roles, teamMembers, clientUsers }) => {
        this.roles.set(roles);
        this.teamMembers.set(teamMembers);
        this.clientUsers.set(clientUsers);
        complete();
      });
  }
}
