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
