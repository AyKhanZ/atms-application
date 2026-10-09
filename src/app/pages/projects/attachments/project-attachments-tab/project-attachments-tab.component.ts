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
import { TranslocoDirective } from '@jsverse/transloco';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AttachmentModel } from '../../../../core/models/attachments';
import { attachmentListKey } from '../../../../core/utils/attachment.utils';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { AttachmentsStoreActions, AttachmentsStoreSelectors } from '../../../../store/attachments';
import { AttachmentFilesService } from '../attachment-files.service';
import { AttachmentTreeNode } from '../attachment-tree-node';
import { buildProjectNodes } from '../attachment-tree.utils';
import { AttachmentListSkeletonComponent } from '../components/attachment-list-skeleton/attachment-list-skeleton.component';
import { AttachmentPreviewDialogComponent } from '../components/attachment-preview-dialog/attachment-preview-dialog.component';
import { AttachmentTreeComponent } from '../components/attachment-tree/attachment-tree.component';

// ticket files are loaded when the branch opens, so thousands of files never load at once
@Component({
  selector: 'app-project-attachments-tab',
  imports: [
    ButtonModule,
    EmptyStateComponent,
    AttachmentListSkeletonComponent,
    AttachmentPreviewDialogComponent,
    AttachmentTreeComponent,
    TranslocoDirective,
  ],
  templateUrl: './project-attachments-tab.component.html',
  styleUrl: './project-attachments-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectAttachmentsTabComponent implements OnDestroy {
  private readonly store = inject(Store);
  private readonly files = inject(AttachmentFilesService);

  readonly projectId = input.required<string>();

  private readonly trees = this.store.selectSignal(AttachmentsStoreSelectors.getTrees);
  private readonly lists = this.store.selectSignal(AttachmentsStoreSelectors.getLists);
  private readonly treeState = computed(() => this.trees()[this.projectId()]);
  readonly loading = computed(() => !this.treeState()?.tree && this.treeState()?.error == null);
  readonly error = computed(() => !this.treeState()?.tree && !!this.treeState()?.error);
  readonly nodes = computed<AttachmentTreeNode[]>(() => {
    const tree = this.treeState()?.tree;
    const lists = this.lists();
    return tree
      ? buildProjectNodes(tree, (ticketId) => lists[this.ticketKey(ticketId)], this.projectId())
      : [];
  });

  // groups and milestones start open, tickets on demand
  readonly openByDefault = (node: AttachmentTreeNode) => node.kind !== 'ticket';

  readonly previewing = signal<AttachmentModel | null>(null);

  private loadedProjectId: string | null = null;
  private readonly ticketKeys = new Set<string>();

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      untracked(() => {
        this.clear();
        this.loadedProjectId = projectId;
        this.store.dispatch(AttachmentsStoreActions.loadTree({ projectId }));
      });
    });
  }

  ngOnDestroy(): void {
    this.clear();
  }

  reload(): void {
    this.store.dispatch(AttachmentsStoreActions.loadTree({ projectId: this.projectId() }));
  }

  loadTicket(node: AttachmentTreeNode, force = false): void {
    if (node.kind !== 'ticket') return;
    const listKey = this.ticketKey(node.id);
    if (!force && this.lists()[listKey]) return;
    this.ticketKeys.add(listKey);
    this.store.dispatch(
      AttachmentsStoreActions.loadList({
        listKey,
        projectId: this.projectId(),
        scope: { kind: 'ticket', workTicketId: node.id },
      }),
    );
  }

  save(file: AttachmentModel): void {
    this.files.save(this.projectId(), file);
  }

  private ticketKey(ticketId: string): string {
    return attachmentListKey({ kind: 'ticket', workTicketId: ticketId });
  }

  private clear(): void {
    if (this.loadedProjectId) {
      this.store.dispatch(AttachmentsStoreActions.clearTree({ projectId: this.loadedProjectId }));
    }
    this.ticketKeys.forEach((listKey) =>
      this.store.dispatch(AttachmentsStoreActions.clearList({ listKey })),
    );
    this.ticketKeys.clear();
  }
}
