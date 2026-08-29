import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { WorkGroupKind, WorkGroupModel } from '../../../../../../../core/models/work-groups';

export type WorkGroupDialogMode = 'create' | 'edit';

export interface WorkGroupDialogSubmitEvent {
  mode: WorkGroupDialogMode;
  kind: WorkGroupKind;
  workGroupId: string | null;
  title: string;
  parentWorkGroupId: string | null;
}

const nonWhitespaceValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { whitespace: true };

@Component({
  selector: 'app-work-group-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './work-group-dialog.component.html',
  styleUrl: './work-group-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkGroupDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly visible = model(false);
  readonly mode = input<WorkGroupDialogMode>('create');
  readonly kind = input.required<WorkGroupKind>();
  readonly item = input<WorkGroupModel | null>(null);
  readonly groups = input<WorkGroupModel[]>([]);
  readonly initialParentWorkGroupId = input<string | null>(null);
  readonly parentSelectionLocked = input(false);
  readonly isSaving = input(false);
  readonly submitted = output<WorkGroupDialogSubmitEvent>();
  readonly submitAttempted = signal(false);

  readonly title = computed(() => {
    const kindLabel = this.kind() === 'group' ? 'group' : 'milestone';

    return this.mode() === 'create' ? `Add ${kindLabel}` : `Edit ${kindLabel}`;
  });
  readonly submitLabel = computed(() => (this.mode() === 'create' ? 'Create' : 'Save'));
  readonly isMilestone = computed(() => this.kind() === 'milestone');
  readonly isParentLocked = computed(() => this.parentSelectionLocked() || this.mode() === 'edit');

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(100),
      nonWhitespaceValidator,
    ]),
    parentWorkGroupId: this.fb.control<string | null>(null),
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;

      const item = this.item();
      const parentWorkGroupId =
        this.mode() === 'edit' ? (item?.parentWorkGroupId ?? null) : this.initialParentWorkGroupId();

      this.form.reset({
        title: item?.title ?? '',
        parentWorkGroupId,
      });
      this.submitAttempted.set(false);
      this.configureParentValidation();
    });
  }

  titleLength(): number {
    return this.form.controls.title.value.length;
  }

  parentTitle(): string {
    const parentId = this.form.controls.parentWorkGroupId.value;

    return (
      this.groups().find((group) => group.id === parentId)?.title ??
      'The selected group is no longer available'
    );
  }

  showError(controlName: 'title' | 'parentWorkGroupId'): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && this.submitAttempted();
  }

  titleError(): string {
    const errors = this.form.controls.title.errors;
    if (!this.showError('title') || !errors) return '';
    if (errors['required'] || errors['whitespace']) return 'Name is required.';
    if (errors['maxlength']) return 'Keep the name within 100 characters.';

    return 'Check the name and try again.';
  }

  updateVisible(visible: boolean): void {
    if (!visible && this.isSaving()) return;
    this.visible.set(visible);
  }

  close(): void {
    if (this.isSaving()) return;
    this.visible.set(false);
  }

  submit(): void {
    if (this.isSaving()) return;

    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      mode: this.mode(),
      kind: this.kind(),
      workGroupId: this.item()?.id ?? null,
      title: value.title.trim(),
      parentWorkGroupId: this.isMilestone() ? value.parentWorkGroupId : null,
    });
  }

  private configureParentValidation(): void {
    const control = this.form.controls.parentWorkGroupId;
    control.clearValidators();

    if (this.isMilestone()) control.addValidators(Validators.required);

    control.updateValueAndValidity({ emitEvent: false });
  }
}
