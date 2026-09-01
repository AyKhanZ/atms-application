import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { TicketFormPageComponent } from '../components/ticket-form-page/ticket-form-page.component';

@Component({
  selector: 'app-ticket-edit',
  imports: [TicketFormPageComponent],
  template: '<app-ticket-form-page mode="edit" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketEditComponent implements HasUnsavedChanges {
  private readonly formPage = viewChild.required(TicketFormPageComponent);

  hasUnsavedChanges(): boolean {
    return this.formPage().hasUnsavedChanges();
  }

  confirmUnsavedChanges(): Promise<boolean> {
    return this.formPage().confirmUnsavedChanges();
  }
}
