import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { ProjectFormPageComponent } from '../components/form-page/form-page.component';

@Component({
  selector: 'app-project-edit',
  imports: [ProjectFormPageComponent],
  templateUrl: './edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectEditComponent implements HasUnsavedChanges {
  private readonly formPage = viewChild.required(ProjectFormPageComponent);

  hasUnsavedChanges(): boolean {
    return this.formPage().hasUnsavedChanges();
  }

  confirmUnsavedChanges(): Promise<boolean> {
    return this.formPage().confirmUnsavedChanges();
  }
}
