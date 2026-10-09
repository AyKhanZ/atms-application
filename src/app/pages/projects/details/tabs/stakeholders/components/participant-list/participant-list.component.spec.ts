import { ComponentFixture, TestBed } from '@angular/core/testing';
import { projectRoleIds } from '../../../../../../../core/constants/project-role-ids.constants';
import {
  WorkProjectInvitationModel,
  WorkProjectParticipantModel,
} from '../../../../../../../core/models/work-projects';
import { translocoTestingProviders } from '../../../../../../../core/testing/transloco-testing';
import { ParticipantListComponent } from './participant-list.component';

describe('ParticipantListComponent', () => {
  const participant = (id: string, hasCompletedOnboarding = true): WorkProjectParticipantModel => ({
    id,
    userId: `user-${id}`,
    name: 'Diana',
    surname: id,
    email: `${id}@client.com`,
    category: 'client',
    hasCompletedOnboarding,
    role: { id: projectRoleIds.clientOrganizationViewer, name: 'Client Viewer', code: 'role' },
  });

  const invitation = (id: string): WorkProjectInvitationModel => ({
    id,
    name: 'Anna',
    surname: id,
    email: `${id}@client.com`,
    role: { id: projectRoleIds.clientOrganizationViewer, name: 'Client Viewer', code: 'role' },
    createdAt: '2026-10-07T10:00:00Z',
  });

  const render = (
    participants: WorkProjectParticipantModel[],
    invitations: WorkProjectInvitationModel[],
    inputs: Partial<{
      canChangeRole: boolean;
      removableParticipantIds: ReadonlySet<string>;
      canCancelInvitations: boolean;
    }> = {},
  ): ComponentFixture<ParticipantListComponent> => {
    const fixture = TestBed.createComponent(ParticipantListComponent);
    fixture.componentRef.setInput('participants', participants);
    fixture.componentRef.setInput('invitations', invitations);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture;
  };

  const element = (fixture: ComponentFixture<ParticipantListComponent>): HTMLElement =>
    fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParticipantListComponent],
      providers: [...translocoTestingProviders()],
    }).compileComponents();
  });

  it('shows the empty state when there is nobody', () => {
    const fixture = render([], []);

    expect(element(fixture).querySelector('.participants-empty')?.textContent).toContain(
      'No participants yet',
    );
    expect(element(fixture).querySelector('.participants-table')).toBeNull();
  });

  it('lists participants first and pending invitations after them', () => {
    const fixture = render([participant('p1')], [invitation('i1')]);

    const names = [...element(fixture).querySelectorAll('.person-copy strong')].map((node) =>
      node.textContent?.trim(),
    );
    expect(names).toEqual(['Diana p1', 'Anna i1']);
  });

  it('shows Invited for pending invitations and for participants who have not finished onboarding', () => {
    const fixture = render([participant('done'), participant('new', false)], [invitation('i1')]);

    const rows = [...element(fixture).querySelectorAll('.participants-row')].slice(1);
    const invited = rows.map((row) => !!row.querySelector('.invited-status'));
    expect(invited).toEqual([false, true, true]);
  });

  it.each([
    [{ canChangeRole: true }, true],
    [{ removableParticipantIds: new Set(['p1']) }, true],
    [{ canCancelInvitations: true }, true],
    [{}, false],
  ])('shows the actions column for %o: %s', (inputs, expected) => {
    const fixture = render([participant('p1')], [invitation('i1')], inputs);

    expect(fixture.componentInstance.hasActionsColumn()).toBe(expected);
    expect(!!element(fixture).querySelector('.actions-head')).toBe(expected);
  });

  it('offers Change role and Remove according to the rights for the selected participant', () => {
    const fixture = render([participant('p1'), participant('p2')], [], {
      canChangeRole: true,
      removableParticipantIds: new Set(['p1']),
    });

    fixture.componentInstance.selectedParticipant.set(participant('p1'));
    expect(fixture.componentInstance.participantActions().map((action) => action.label)).toEqual([
      'Change role',
      'Remove',
    ]);

    fixture.componentInstance.selectedParticipant.set(participant('p2'));
    expect(fixture.componentInstance.participantActions().map((action) => action.label)).toEqual([
      'Change role',
    ]);
  });

  it('hides the menu button of a participant nobody may change or remove', () => {
    const fixture = render([participant('p1')], [], {
      canChangeRole: false,
      removableParticipantIds: new Set(['other']),
    });

    expect(element(fixture).querySelector('.row-menu-button')).toBeNull();
  });

  it('gives an invitation row only Cancel invitation, and only to those who may invite', () => {
    const fixture = render([], [invitation('i1')], { canCancelInvitations: true });

    const menuButton = element(fixture).querySelector(
      '.participants-row:last-child .row-menu-button',
    );
    expect(menuButton?.getAttribute('aria-label')).toContain('i1@client.com');
    expect(fixture.componentInstance.invitationActions().map((action) => action.label)).toEqual([
      'Cancel invitation',
    ]);

    const withoutRight = render([], [invitation('i1')], { canCancelInvitations: false });
    expect(element(withoutRight).querySelector('.row-menu-button')).toBeNull();
  });

  it('emits the selected participant or invitation from the menu commands', () => {
    const fixture = render([participant('p1')], [invitation('i1')], {
      canChangeRole: true,
      removableParticipantIds: new Set(['p1']),
      canCancelInvitations: true,
    });
    const changeRole = vi.fn();
    const remove = vi.fn();
    const cancel = vi.fn();
    fixture.componentInstance.changeRole.subscribe(changeRole);
    fixture.componentInstance.remove.subscribe(remove);
    fixture.componentInstance.cancelInvitation.subscribe(cancel);

    fixture.componentInstance.selectedParticipant.set(participant('p1'));
    fixture.componentInstance.selectedInvitation.set(invitation('i1'));
    for (const action of fixture.componentInstance.participantActions()) action.command?.({});
    for (const action of fixture.componentInstance.invitationActions()) action.command?.({});

    expect(changeRole).toHaveBeenCalledWith(participant('p1'));
    expect(remove).toHaveBeenCalledWith(participant('p1'));
    expect(cancel).toHaveBeenCalledWith(invitation('i1'));
  });
});
