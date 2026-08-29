import { ComponentFixture, TestBed } from '@angular/core/testing';
import { projectRoleIds } from '../../../../../../../core/constants/project-role-ids.constants';
import { WorkProjectRoleModel } from '../../../../../../../core/models/work-projects';
import { AddParticipantDialogComponent } from './add-participant-dialog.component';

describe('AddParticipantDialogComponent', () => {
  let fixture: ComponentFixture<AddParticipantDialogComponent>;
  let component: AddParticipantDialogComponent;

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
