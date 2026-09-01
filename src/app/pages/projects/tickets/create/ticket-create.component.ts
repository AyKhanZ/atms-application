import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { TicketFormPageComponent } from '../components/ticket-form-page/ticket-form-page.component';

@Component({
  selector: 'app-ticket-create',
  imports: [TicketFormPageComponent],
  template: '<app-ticket-form-page mode="create" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketCreateComponent implements HasUnsavedChanges {
  private readonly formPage = viewChild.required(TicketFormPageComponent);

  hasUnsavedChanges(): boolean {
    return this.formPage().hasUnsavedChanges();
  }

  confirmUnsavedChanges(): Promise<boolean> {
    return this.formPage().confirmUnsavedChanges();
  }
}
