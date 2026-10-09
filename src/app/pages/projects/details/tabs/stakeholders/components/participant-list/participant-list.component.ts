import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { currentLanguage } from '../../../../../../../core/i18n/active-language';
import {
  WorkProjectInvitationModel,
  WorkProjectParticipantModel,
} from '../../../../../../../core/models/work-projects';
import { ProfileAvatarComponent } from '../../../../../../../shared/components/profile-avatar/profile-avatar.component';
import {
  PersonInitialsPipe,
  PersonNamePipe,
} from '../../../../../../../shared/pipes/person-name.pipe';

@Component({
  selector: 'app-participant-list',
  imports: [
    MenuModule,
    ProfileAvatarComponent,
    PersonNamePipe,
    PersonInitialsPipe,
    TranslocoDirective,
  ],
  templateUrl: './participant-list.component.html',
  styleUrl: './participant-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipantListComponent {
  private readonly transloco = inject(TranslocoService);

  readonly participants = input.required<WorkProjectParticipantModel[]>();
  readonly invitations = input.required<WorkProjectInvitationModel[]>();
  readonly canChangeRole = input(false);
  // server checks the same per participant
  readonly removableParticipantIds = input<ReadonlySet<string>>(new Set<string>());
  readonly canCancelInvitations = input(false);

  readonly changeRole = output<WorkProjectParticipantModel>();
  readonly remove = output<WorkProjectParticipantModel>();
  readonly cancelInvitation = output<WorkProjectInvitationModel>();

  readonly selectedParticipant = signal<WorkProjectParticipantModel | null>(null);
  readonly selectedInvitation = signal<WorkProjectInvitationModel | null>(null);

  readonly isEmpty = computed(
    () => this.participants().length === 0 && this.invitations().length === 0,
  );
  readonly hasActionsColumn = computed(
    () =>
      this.canChangeRole() ||
      this.removableParticipantIds().size > 0 ||
      (this.canCancelInvitations() && this.invitations().length > 0),
  );

  // menu items are read when the menu opens, not once at construction
  readonly invitationActions = computed<MenuItem[]>(() => {
    currentLanguage();
    return [
      {
        label: this.transloco.translate('participants.cancelInvitation'),
        icon: 'pi pi-times',
        styleClass: 'participant-menu-danger',
        command: () => {
          const invitation = this.selectedInvitation();
          if (invitation) this.cancelInvitation.emit(invitation);
        },
      },
    ];
  });

  readonly participantActions = computed<MenuItem[]>(() => {
    currentLanguage();
    const actions: MenuItem[] = [];
    if (this.canChangeRole()) {
      actions.push({
        label: this.transloco.translate('participants.changeRole'),
        icon: 'pi pi-pencil',
        command: () => {
          const participant = this.selectedParticipant();
          if (participant) this.changeRole.emit(participant);
        },
      });
    }
    const selected = this.selectedParticipant();
    if (selected && this.removableParticipantIds().has(selected.id)) {
      actions.push({
        label: this.transloco.translate('common.remove'),
        icon: 'pi pi-trash',
        styleClass: 'participant-menu-danger',
        command: () => {
          const participant = this.selectedParticipant();
          if (participant) this.remove.emit(participant);
        },
      });
    }
    return actions;
  });

  hasParticipantActions(participant: WorkProjectParticipantModel): boolean {
    return this.canChangeRole() || this.removableParticipantIds().has(participant.id);
  }

  openParticipantMenu(event: Event, participant: WorkProjectParticipantModel, menu: Menu): void {
    this.selectedParticipant.set(participant);
    menu.toggle(event);
  }

  openInvitationMenu(event: Event, invitation: WorkProjectInvitationModel, menu: Menu): void {
    this.selectedInvitation.set(invitation);
    menu.toggle(event);
  }
}
