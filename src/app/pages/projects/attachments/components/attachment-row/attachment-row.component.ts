import { AppDatePipe } from '../../../../../shared/pipes/app-date.pipe';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { AttachmentModel } from '../../../../../core/models/attachments';
import { canPreviewAttachment } from '../../../../../core/utils/attachment.utils';
import { WorkItemAssigneeComponent } from '../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import {
  AttachmentIconPipe,
  AttachmentTonePipe,
  FileSizePipe,
} from '../../../../../shared/pipes/attachment.pipe';
import { PersonShortNamePipe } from '../../../../../shared/pipes/person-name.pipe';

// same row in the task list and every tree
@Component({
  selector: 'app-attachment-row',
  imports: [
    AppDatePipe,
    MenuModule,
    TooltipModule,
    WorkItemAssigneeComponent,
    AttachmentIconPipe,
    AttachmentTonePipe,
    FileSizePipe,
    PersonShortNamePipe,
  ],
  templateUrl: './attachment-row.component.html',
  styleUrl: './attachment-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentRowComponent {
  readonly attachment = input.required<AttachmentModel>();
  // only on the task the file belongs to
  readonly editable = input(false);
  readonly pending = input(false);

  readonly preview = output<AttachmentModel>();
  readonly download = output<AttachmentModel>();
  readonly rename = output<AttachmentModel>();
  readonly remove = output<AttachmentModel>();

  readonly canPreview = computed(() => canPreviewAttachment(this.attachment()));

  // on a phone the eye and the arrow go into this menu too
  readonly menuItems = computed<MenuItem[]>(() => {
    const file = this.attachment();
    const items: MenuItem[] = [];
    if (this.canPreview()) {
      items.push({ label: 'Preview', icon: 'pi pi-eye', command: () => this.preview.emit(file) });
    }
    items.push({ label: 'Download', icon: 'pi pi-download', command: () => this.download.emit(file) });
    if (this.editable()) {
      items.push(
        { separator: true },
        { label: 'Rename', icon: 'pi pi-pencil', command: () => this.rename.emit(file) },
        {
          label: 'Delete',
          icon: 'pi pi-trash',
          styleClass: 'work-groups-menu-danger',
          command: () => this.remove.emit(file),
        },
      );
    }
    return items;
  });

  open(): void {
    const file = this.attachment();
    if (this.canPreview()) this.preview.emit(file);
    else this.download.emit(file);
  }

  openMenu(event: Event, menu: Menu): void {
    menu.toggle(event);
  }
}
