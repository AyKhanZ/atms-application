import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Select } from 'primeng/select';
import { projectRoleIds } from '../../../../../../../core/constants/project-role-ids.constants';
import { WorkProjectRoleModel } from '../../../../../../../core/models/work-projects';
import { AddParticipantDialogComponent } from './add-participant-dialog.component';

// A PrimeNG dialog with its overlays renders slowly: under a busy machine one test can pass 5s.
describe('AddParticipantDialogComponent', { timeout: 20_000 }, () => {
  let fixture: ComponentFixture<AddParticipantDialogComponent>;
  let component: AddParticipantDialogComponent;
  const originalMatchMedia = window.matchMedia;

  const roles: WorkProjectRoleModel[] = [
    {
      id: projectRoleIds.clientOrganizationManager,
      name: 'Client Manager',
      code: 'client-manager',
    },
    {
      id: projectRoleIds.developer,
      name: 'Developer',
      code: 'developer',
    },
  ];

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } satisfies MediaQueryList),
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddParticipantDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddParticipantDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('roles', roles);
    fixture.componentRef.setInput('users', [
      {
        id: 'client-user',
        name: 'Client',
        surname: 'User',
        email: 'client@example.com',
        side: 'client',
      },
    ]);
    fixture.detectChanges();
  });

  it('offers only roles available to the selected participant side', () => {
    component.form.controls.userId.setValue('client-user');

    expect(component.availableRoles().map((role) => role.id)).toEqual([
      projectRoleIds.clientOrganizationManager,
    ]);
  });

  it('renders participant options with an avatar, name, and email', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const userSelect = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    userSelect.show();
    fixture.detectChanges();
    await fixture.whenStable();

    const option = document.body.querySelector('.participant-user-select-panel .user-option');
    expect(option?.querySelector('app-profile-avatar')).not.toBeNull();
    expect(option?.querySelector('strong')?.textContent?.trim()).toBe('Client User');
    expect(option?.querySelector('small')?.textContent?.trim()).toBe('client@example.com');
  });

  it('keeps the selected user while the dialog remains open', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.form.controls.userId.setValue('client-user');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.controls.userId.value).toBe('client-user');
    expect(component.form.controls.roleId.enabled).toBe(true);
    expect(component.showError('userId')).toBe(false);
  });

  it('shows validation only after an add attempt', () => {
    component.form.controls.userId.markAsTouched();
    component.form.controls.roleId.markAsTouched();

    expect(component.showError('userId')).toBe(false);
    expect(component.showError('roleId')).toBe(false);

    component.submit();

    expect(component.showError('userId')).toBe(true);
    expect(component.showError('roleId')).toBe(false);

    component.form.controls.userId.setValue('client-user');

    expect(component.showError('roleId')).toBe(true);
  });

  it('resets the form each time the dialog is reopened', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
    component.form.controls.userId.setValue('client-user');

    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.form.getRawValue()).toEqual({ userId: '', roleId: '' });
    expect(component.form.controls.roleId.disabled).toBe(true);
  });

  it('emits a valid participant command', () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.form.controls.userId.setValue('client-user');
    component.form.controls.roleId.setValue(projectRoleIds.clientOrganizationManager);

    component.submit();

    expect(submitted).toHaveBeenCalledWith({
      userId: 'client-user',
      roleId: projectRoleIds.clientOrganizationManager,
    });
  });

  describe('invite by email', () => {
    let userSelect: Select | null = null;

    // An overlay left open keeps animating after the suite has put matchMedia back.
    afterEach(async () => {
      userSelect?.hide();
      userSelect = null;
      fixture.detectChanges();
      await fixture.whenStable();
    });

    async function openSearch(text: string): Promise<void> {
      fixture.componentRef.setInput('canInviteByEmail', true);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();

      userSelect = fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
      userSelect.show();
      component.onSearch({ originalEvent: new Event('input'), filter: text });
      // Set the filter directly: typing schedules an overlay realign that outlives the test.
      userSelect._filterValue.set(text);
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it('offers to invite a full email nobody has', async () => {
      await openSearch('anna@client.com');

      const empty = document.body.querySelector('.participant-user-select-panel .search-empty');
      expect(empty?.textContent).toContain('No user with this email.');
      expect(empty?.querySelector('button')?.textContent).toContain('Invite anna@client.com');
    });

    it('asks for a full email when the text is not one', async () => {
      await openSearch('anna');

      const empty = document.body.querySelector('.participant-user-select-panel .search-empty');
      expect(empty?.textContent).toContain('Type a full email to invite.');
      expect(empty?.querySelector('button')).toBeNull();
    });

    it('offers nothing to invite where inviting is not allowed', async () => {
      await openSearch('anna@client.com');
      fixture.componentRef.setInput('canInviteByEmail', false);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('.invite-link')).toBeNull();
      const empty = document.body.querySelector('.participant-user-select-panel .search-empty');
      expect(empty?.textContent?.trim()).toBe('No users found.');
    });

    it('switches to the invite form with the searched email filled in', async () => {
      await openSearch('anna@client.com');

      const email = component.searchedEmail();
      userSelect?.hide();
      userSelect = null;
      component.openInvite(email);
      fixture.detectChanges();

      expect(component.header()).toBe('Invite to project');
      expect(component.inviteForm.getRawValue()).toEqual({
        email: 'anna@client.com',
        name: '',
        surname: '',
      });
      expect(
        [...fixture.nativeElement.querySelectorAll('form:last-of-type label')].map((label) =>
          (label as HTMLElement).textContent?.trim(),
        ),
      ).toEqual(['Name', 'Surname', 'Email']);
    });

    // Both modes stay in the dialog so it keeps its size; only the active one can be reached.
    it('keeps both modes rendered and makes the hidden one inert', async () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();
      component.openInvite('anna@client.com');
      fixture.detectChanges();

      const [search, invite] = [...fixture.nativeElement.querySelectorAll('form')] as HTMLElement[];
      expect(search.hasAttribute('inert')).toBe(true);
      expect(search.classList).toContain('dialog-mode--hidden');
      expect(invite.hasAttribute('inert')).toBe(false);
    });

    it('requires a name and surname before sending', () => {
      const invited = vi.fn();
      component.invited.subscribe(invited);
      component.openInvite('anna@client.com');
      component.inviteForm.controls.name.setValue('   ');

      component.submitInvite();

      expect(invited).not.toHaveBeenCalled();
      expect(component.inviteFieldError('name')).toBe('Enter a name.');
      expect(component.inviteFieldError('surname')).toBe('Enter a surname.');
      expect(component.inviteFieldError('email')).toBe('');
    });

    it('rejects an invalid or too long email', () => {
      component.openInvite('not-an-email');
      component.submitInvite();

      expect(component.inviteFieldError('email')).toBe('Enter a valid email.');

      component.inviteForm.controls.email.setValue(`anna@${'b'.repeat(60)}.${'c'.repeat(40)}.com`);

      expect(component.inviteFieldError('email')).toBe('Email must be at most 100 characters.');
    });

    it('emits the trimmed invitation', () => {
      const invited = vi.fn();
      component.invited.subscribe(invited);
      component.openInvite('anna@client.com');
      component.inviteForm.controls.name.setValue(' Anna ');
      component.inviteForm.controls.surname.setValue('Smith ');

      component.submitInvite();

      expect(invited).toHaveBeenCalledWith({
        email: 'anna@client.com',
        name: 'Anna',
        surname: 'Smith',
      });
    });

    it('shows the server refusal under the email until the email changes', () => {
      component.openInvite('anna@client.com');
      fixture.componentRef.setInput('inviteError', 'This email has already been invited.');
      fixture.detectChanges();

      expect(component.inviteFieldError('email')).toBe('This email has already been invited.');

      component.inviteForm.controls.email.setValue('anna.smith@client.com');

      expect(component.inviteFieldError('email')).toBe('');
    });

    it('goes back to the search and opens in search mode next time', async () => {
      component.openInvite('anna@client.com');
      component.backToSearch();

      expect(component.mode()).toBe('search');

      component.openInvite('anna@client.com');
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component.mode()).toBe('search');
      expect(component.header()).toBe('Add participant');
    });
  });
});
