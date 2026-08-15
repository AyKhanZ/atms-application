import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProjectFormPageComponent } from '../components/form-page/form-page.component';

@Component({
  selector: 'app-project-edit',
  imports: [ProjectFormPageComponent],
  templateUrl: './edit.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectEditComponent {}
