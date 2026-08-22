import { ComponentFixture, TestBed } from '@angular/core/testing';
import { projectRoleIds } from '../../../../../core/constants/project-role-ids.constants';
import {
  WorkProjectParticipantModel,
  WorkProjectRoleModel,
} from '../../../../../core/models/work-projects';
import { ChangeParticipantRoleDialogComponent } from './change-participant-role-dialog.component';

describe('ChangeParticipantRoleDialogComponent', () => {
  let fixture: ComponentFixture<ChangeParticipantRoleDialogComponent>;
  let component: ChangeParticipantRoleDialogComponent;

  const roles: WorkProjectRoleModel[] = [
    {
      id: projectRoleIds.clientOrganizationViewer,
      name: 'Client Viewer',
      code: 'client-viewer',
    },
    {
      id: projectRoleIds.developer,
      name: 'Developer',
      code: 'developer',
    },
  ];
  const participant: WorkProjectParticipantModel = {
    id: 'participant-id',
    userId: 'user-id',
    name: 'Diana',
    surname: 'Zeynalova',
    email: 'diana@example.com',
    category: 'client',
    role: roles[0],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeParticipantRoleDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChangeParticipantRoleDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('roles', roles);
    fixture.componentRef.setInput('participant', participant);
    fixture.detectChanges();
  });

  it('offers only roles available to the participant side', () => {
    expect(component.availableRoles().map((role) => role.id)).toEqual([
      projectRoleIds.clientOrganizationViewer,
    ]);
  });

  it('emits the selected role', () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.form.controls.roleId.setValue(projectRoleIds.clientOrganizationViewer);

    component.submit();

    expect(submitted).toHaveBeenCalledWith(projectRoleIds.clientOrganizationViewer);
  });
});
