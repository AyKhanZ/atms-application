import {
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';

export type InvitationGroup = FormGroup<{
  name: FormControl<string>;
  surname: FormControl<string>;
  email: FormControl<string>;
}>;

@Component({
  selector: 'app-onboarding-invitations',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TooltipModule, TranslocoDirective],
  templateUrl: './onboarding-invitations.component.html',
  styleUrl: './onboarding-invitations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingInvitationsComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  readonly rows = input.required<FormArray<InvitationGroup>>();
  readonly max = input.required<number>();
  readonly loading = input(false, { transform: booleanAttribute });
  readonly add = output<void>();
  readonly remove = output<number>();

  get canAdd(): boolean {
    return this.rows().length < this.max();
  }

  constructor() {
    // the parent rebuilds the rows in place, the same form array never trips OnPush
    effect((onCleanup) => {
      const subscription = this.rows().events.subscribe(() => this.cdr.markForCheck());
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
