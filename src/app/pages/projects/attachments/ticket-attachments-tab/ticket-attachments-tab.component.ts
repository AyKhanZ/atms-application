import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AttachmentModel } from '../../../../core/models/attachments';
import { attachmentListKey } from '../../../../core/utils/attachment.utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AttachmentsStoreActions, AttachmentsStoreSelectors } from '../../../../store/attachments';
import { AttachmentFilesService } from '../attachment-files.service';
import { AttachmentTreeNode } from '../attachment-tree-node';
import { buildTaskNodes, countFiles } from '../attachment-tree.utils';
import { AttachmentListSkeletonComponent } from '../components/attachment-list-skeleton/attachment-list-skeleton.component';
import { AttachmentPreviewDialogComponent } from '../components/attachment-preview-dialog/attachment-preview-dialog.component';
import { AttachmentTreeComponent } from '../components/attachment-tree/attachment-tree.component';

/** Past this many files only the first task starts open; below it the whole tree does. */
const OPEN_ALL_UP_TO = 20;

/** Every file in the ticket, under the task or subtask it was added to. Read-only. */
@Component({
  selector: 'app-ticket-attachments-tab',
  imports: [
    ButtonModule,
    EmptyStateComponent,
    AttachmentListSkeletonComponent,
    AttachmentPreviewDialogComponent,
    AttachmentTreeComponent,
  ],
  templateUrl: './ticket-attachments-tab.component.html',
  styleUrl: './ticket-attachments-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketAttachmentsTabComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly files = inject(AttachmentFilesService);

  readonly projectId = input.required<string>();
  readonly ticketId = input.required<string>();

  private readonly lists = this.store.selectSignal(AttachmentsStoreSelectors.getLists);
  readonly listKey = computed(() =>
    attachmentListKey({ kind: 'ticket', workTicketId: this.ticketId() }),
  );
  private readonly list = computed(() => this.lists()[this.listKey()]);
  readonly loading = computed(() => !this.list() || (this.list()!.loading && !this.nodes().length));
  readonly error = computed(() => !!this.list()?.error && !this.nodes().length);
  readonly hasMore = computed(() => this.list()?.hasMore ?? false);
  readonly nodes = computed<AttachmentTreeNode[]>(() =>
    buildTaskNodes(this.list()?.items ?? [], this.projectId(), this.ticketId()),
  );
  private readonly firstKey = computed(() => this.nodes()[0]?.key ?? null);
  readonly openByDefault = (node: AttachmentTreeNode) =>
    countFiles(this.nodes()) <= OPEN_ALL_UP_TO ||
    node.key === this.firstKey() ||
    this.nodes()[0]?.children.some((child) => child.key === node.key) === true;

  readonly previewing = signal<AttachmentModel | null>(null);

  private loadedKey: string | null = null;

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      const ticketId = this.ticketId();
      const listKey = this.listKey();
      untracked(() => {
        if (this.loadedKey && this.loadedKey !== listKey) this.clear(this.loadedKey);
        this.loadedKey = listKey;
        this.store.dispatch(
          AttachmentsStoreActions.loadList({
            listKey,
            projectId,
            scope: { kind: 'ticket', workTicketId: ticketId },
          }),
        );
      });
    });
  }

  ngOnDestroy(): void {
    if (this.loadedKey) this.clear(this.loadedKey);
  }

  reload(): void {
    this.store.dispatch(
      AttachmentsStoreActions.loadList({
        listKey: this.listKey(),
        projectId: this.projectId(),
        scope: { kind: 'ticket', workTicketId: this.ticketId() },
      }),
    );
  }

  save(file: AttachmentModel): void {
    this.files.save(this.projectId(), file);
  }

  private clear(listKey: string): void {
    this.store.dispatch(AttachmentsStoreActions.clearList({ listKey }));
  }
}
