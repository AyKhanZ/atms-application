import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { HasUnsavedChanges } from '../../../core/guards/unsaved-changes.guard';
import { ProjectFormPageComponent } from '../components/form-page/form-page.component';

@Component({
  selector: 'app-project-create',
  imports: [ProjectFormPageComponent],
  templateUrl: './create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCreateComponent implements HasUnsavedChanges {
  private readonly formPage = viewChild.required(ProjectFormPageComponent);

  hasUnsavedChanges(): boolean {
    return this.formPage().hasUnsavedChanges();
  }
}
