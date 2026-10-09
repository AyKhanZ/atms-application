import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { AttachmentModel } from '../../../../../core/models/attachments';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { AttachmentTreeNode } from '../../attachment-tree-node';
import { nodeKeys } from '../../attachment-tree.utils';
import {
  AttachmentTreeExpansion,
  AttachmentTreeExpansionService,
} from '../../attachment-tree-expansion.service';
import { AttachmentRowComponent } from '../attachment-row/attachment-row.component';

// opening it costs a request
function isUnread(node: AttachmentTreeNode): boolean {
  return node.lazy && node.children.length === 0 && (node.loading || node.error);
}

// same as Plan
const EXPANSION_CONTROLS_FROM = 4;

// read-only: files are changed only on their task
@Component({
  selector: 'app-attachment-tree',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    WorkItemRefComponent,
    AttachmentRowComponent,
    TranslocoDirective,
  ],
  templateUrl: './attachment-tree.component.html',
  styleUrl: './attachment-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentTreeComponent {
  private readonly expansionService = inject(AttachmentTreeExpansionService, { optional: true });

  readonly nodes = input.required<AttachmentTreeNode[]>();
  readonly heading = input.required<string>();
  readonly stateKey = input.required<string>();
  readonly defaultOpen = input<(node: AttachmentTreeNode) => boolean>(() => true);

  readonly preview = output<AttachmentModel>();
  readonly download = output<AttachmentModel>();
  readonly opened = output<AttachmentTreeNode>();
  readonly retry = output<AttachmentTreeNode>();

  readonly expanded = signal<ReadonlySet<string>>(new Set());
  readonly fileCount = computed(() => this.nodes().reduce((sum, item) => sum + item.fileCount, 0));
  readonly keys = computed(() => nodeKeys(this.nodes()));
  readonly showExpansionControls = computed(() => this.keys().length >= EXPANSION_CONTROLS_FROM);
  // unread tickets stay shut, opening all would fire a request per ticket (200 in a big project)
  readonly expandableKeys = computed(() => {
    const keys: string[] = [];
    this.forEachNode(this.nodes(), (node) => {
      if (!isUnread(node)) keys.push(node.key);
    });
    return keys;
  });
  readonly allExpanded = computed(() => {
    const expanded = this.expanded();
    return this.expandableKeys().every((key) => expanded.has(key));
  });

  private state: AttachmentTreeExpansion = { expanded: new Set(), seen: new Set() };

  constructor() {
    effect(() => {
      const stateKey = this.stateKey();
      untracked(() => {
        this.state = this.expansionService?.get(stateKey) ?? { expanded: new Set(), seen: new Set() };
        this.expanded.set(new Set(this.state.expanded));
      });
    });

    // default state only the first time, then it stays as the user left it
    effect(() => {
      const nodes = this.nodes();
      const defaultOpen = this.defaultOpen();
      untracked(() => this.applyDefaults(nodes, defaultOpen));
    });
  }

  toggle(node: AttachmentTreeNode): void {
    const expanded = new Set(this.expanded());
    if (expanded.has(node.key)) {
      expanded.delete(node.key);
    } else {
      expanded.add(node.key);
      this.requestFiles(node);
    }
    this.save(expanded);
  }

  toggleAll(): void {
    if (this.allExpanded()) {
      this.save(new Set());
      return;
    }
    this.save(new Set([...this.expanded(), ...this.expandableKeys()]));
  }

  private applyDefaults(
    nodes: AttachmentTreeNode[],
    defaultOpen: (node: AttachmentTreeNode) => boolean,
  ): void {
    const expanded = new Set(this.expanded());
    let changed = false;
    this.forEachNode(nodes, (node) => {
      if (this.state.seen.has(node.key)) return;
      this.state.seen.add(node.key);
      if (defaultOpen(node)) {
        expanded.add(node.key);
        changed = true;
      }
    });
    if (changed) this.save(expanded);
    this.forEachNode(nodes, (node) => {
      if (expanded.has(node.key)) this.requestFiles(node);
    });
  }

  private requestFiles(node: AttachmentTreeNode): void {
    if (node.lazy && node.loading) this.opened.emit(node);
  }

  private save(expanded: Set<string>): void {
    this.state.expanded = expanded;
    this.expanded.set(expanded);
  }

  private forEachNode(
    nodes: readonly AttachmentTreeNode[],
    visit: (node: AttachmentTreeNode) => void,
  ): void {
    for (const node of nodes) {
      visit(node);
      this.forEachNode(node.children, visit);
    }
  }
}
