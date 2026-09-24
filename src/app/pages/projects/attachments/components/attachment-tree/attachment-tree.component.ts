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

/** A lazy branch whose files have not been read: opening it costs a request. */
function isUnread(node: AttachmentTreeNode): boolean {
  return node.lazy && node.children.length === 0 && (node.loading || node.error);
}

/** Expand all / Collapse all only pays for itself past this many branches, as in Plan. */
const EXPANSION_CONTROLS_FROM = 4;

/**
 * Files laid out along the plan: each level is a row with its icon, code and title, indented one
 * step under its parent with a guide line down everything it holds — the same drawing as Location
 * and the Parent select, so "this file sits inside that subtask" reads the same way everywhere.
 * Read-only: files are changed only on the task or subtask they belong to.
 */
@Component({
  selector: 'app-attachment-tree',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    WorkItemRefComponent,
    AttachmentRowComponent,
  ],
  templateUrl: './attachment-tree.component.html',
  styleUrl: './attachment-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentTreeComponent {
  private readonly expansionService = inject(AttachmentTreeExpansionService, { optional: true });

  readonly nodes = input.required<AttachmentTreeNode[]>();
  readonly heading = input.required<string>();
  /** Where the open branches are remembered: one key per tree on the page. */
  readonly stateKey = input.required<string>();
  /** Whether a branch seen for the first time starts open. */
  readonly defaultOpen = input<(node: AttachmentTreeNode) => boolean>(() => true);

  readonly preview = output<AttachmentModel>();
  readonly download = output<AttachmentModel>();
  /** A lazy branch was opened and has no files yet. */
  readonly opened = output<AttachmentTreeNode>();
  readonly retry = output<AttachmentTreeNode>();

  readonly expanded = signal<ReadonlySet<string>>(new Set());
  readonly fileCount = computed(() => this.nodes().reduce((sum, item) => sum + item.fileCount, 0));
  readonly keys = computed(() => nodeKeys(this.nodes()));
  readonly showExpansionControls = computed(() => this.keys().length >= EXPANSION_CONTROLS_FROM);
  /**
   * What Expand all opens: everything already on the page. A ticket whose files are not read yet
   * stays shut — opening every one would fire a request per ticket at once, two hundred in a big
   * project. It opens, and loads, when the user opens it.
   */
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

    // A branch gets its default state once, the first time it shows up; after that it stays as
    // the user left it, even when the list is read again.
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
