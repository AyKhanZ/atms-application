import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProjectFormPageComponent } from '../components/form-page/form-page.component';

@Component({
  selector: 'app-project-create',
  imports: [ProjectFormPageComponent],
  templateUrl: './create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCreateComponent {}
