import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkGroupModel } from '../../../../../../../core/models/work-groups';
import { WorkGroupDialogComponent } from './work-group-dialog.component';

const group: WorkGroupModel = {
  id: 'group-1',
  title: 'Delivery',
  parentWorkGroupId: null,
  status: { id: 1, name: 'Planned', code: 'Planned' },
  ticketCount: 0,
  milestones: [],
};

describe('WorkGroupDialogComponent', () => {
  let fixture: ComponentFixture<WorkGroupDialogComponent>;
  let component: WorkGroupDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkGroupDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkGroupDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('kind', 'group');
    fixture.detectChanges();
  });

  it('rejects a blank or overlong name', () => {
    component.form.controls.title.setValue('   ');
    component.form.controls.title.markAsTouched();
    expect(component.form.controls.title.invalid).toBe(true);
    expect(component.titleError()).toBe('Name is required.');

    component.form.controls.title.setValue('a'.repeat(101));
    expect(component.form.controls.title.invalid).toBe(true);
    expect(component.titleError()).toBe('Keep the name within 100 characters.');
  });

  it('trims and emits a valid group name', () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    component.form.controls.title.setValue('  Delivery  ');

    component.submit();

    expect(submitted).toHaveBeenCalledWith({
      mode: 'create',
      kind: 'group',
      workGroupId: null,
      title: 'Delivery',
      parentWorkGroupId: null,
    });
  });

  it('requires a parent when creating a milestone', () => {
    fixture.componentRef.setInput('kind', 'milestone');
    fixture.componentRef.setInput('groups', [group]);
    component.visible.set(true);
    fixture.detectChanges();
    component.initializeForm();
    component.form.controls.title.setValue('Discovery');

    component.submit();

    expect(component.form.controls.parentWorkGroupId.hasError('required')).toBe(true);
  });

  it('keeps the selected parent when creating a milestone', () => {
    const submitted = vi.fn();
    component.submitted.subscribe(submitted);
    fixture.componentRef.setInput('kind', 'milestone');
    fixture.componentRef.setInput('groups', [group]);
    component.visible.set(true);
    fixture.detectChanges();
    component.initializeForm();
    component.form.setValue({
      title: 'Discovery',
      parentWorkGroupId: group.id,
    });
    fixture.detectChanges();

    component.submit();

    expect(submitted).toHaveBeenCalledWith({
      mode: 'create',
      kind: 'milestone',
      workGroupId: null,
      title: 'Discovery',
      parentWorkGroupId: group.id,
    });
  });
});
