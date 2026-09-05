import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { TaskFormPageComponent } from '../components/task-form-page/task-form-page.component';

@Component({
  selector: 'app-task-edit',
  imports: [TaskFormPageComponent],
  template: '<app-task-form-page mode="edit" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskEditComponent implements HasUnsavedChanges {
  private readonly formPage = viewChild.required(TaskFormPageComponent);
  hasUnsavedChanges(): boolean {
    return this.formPage().hasUnsavedChanges();
  }
  confirmUnsavedChanges(): Promise<boolean> {
    return this.formPage().confirmUnsavedChanges();
  }
}
