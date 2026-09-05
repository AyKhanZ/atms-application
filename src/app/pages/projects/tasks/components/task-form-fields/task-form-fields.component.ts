import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { WorkProjectParticipantModel } from '../../../../../core/models/work-projects';
import { formatDateInput, parseDisplayDate } from '../../../../../core/utils/date-input.utils';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';

export type TaskFormGroup = FormGroup<{
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  priorityId: FormControl<number | null>;
  statusId: FormControl<number | null>;
  deadline: FormControl<Date | null>;
  assigneeId: FormControl<string | null>;
}>;

@Component({
  selector: 'app-task-form-fields',
  imports: [
    ReactiveFormsModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ProfileAvatarComponent,
    PersonInitialsPipe,
    PersonNamePipe,
  ],
  templateUrl: './task-form-fields.component.html',
  styleUrls: [
    '../../../components/form-page/form-page.component.scss',
    './task-form-fields.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormFieldsComponent {
  readonly form = input.required<TaskFormGroup>();
  readonly submitted = input(false);
  readonly priorities = input<DictionaryModel[]>([]);
  readonly statuses = input<DictionaryModel[]>([]);
  readonly assignees = input<WorkProjectParticipantModel[]>([]);
  readonly isEdit = input(false);
  readonly submitForm = output<void>();

  error(name: 'title' | 'priorityId' | 'statusId'): string {
    const control = this.form().controls[name];
    if ((!this.submitted() && !control.touched) || !control.errors) return '';
    if (control.errors['required']) {
      const label = name === 'title' ? 'Name' : name === 'priorityId' ? 'Priority' : 'Status';
      return `${label} is required.`;
    }
    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} characters.`;
    }
    return 'Invalid value.';
  }

  onDateInput(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    if (!inputElement) return;
    const formatted = formatDateInput(inputElement.value);
    inputElement.value = formatted;
    const date = parseDisplayDate(formatted);
    if (date) this.form().controls.deadline.setValue(date);
  }

  onDateBlur(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    if (inputElement?.value && !parseDisplayDate(inputElement.value)) {
      this.form().controls.deadline.setValue(null);
    }
  }
}
