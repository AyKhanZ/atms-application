import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Select } from 'primeng/select';
import { projectRoleIds } from '../../../../../../../core/constants/project-role-ids.constants';
import { WorkProjectRoleModel } from '../../../../../../../core/models/work-projects';
import { AddParticipantDialogComponent } from './add-participant-dialog.component';

describe('AddParticipantDialogComponent', () => {
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
});
