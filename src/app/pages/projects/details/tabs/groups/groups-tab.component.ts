import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Menu, MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { HasProjectAccessDirective } from '../../../../../core/directives/has-project-access.directive';
import { ProjectPermissions } from '../../../../../core/enums/project-permissions.enum';
import { WorkGroupKind, WorkGroupModel } from '../../../../../core/models/work-groups';
import { ProjectAccessService } from '../../../../../core/services/project-access.service';
import { WorkGroupsStoreActions, WorkGroupsStoreSelectors } from '../../../../../store/work-groups';
import {
  WorkGroupDialogComponent,
  WorkGroupDialogMode,
  WorkGroupDialogSubmitEvent,
} from './components/work-group-dialog/work-group-dialog.component';
import { WorkGroupStatusBadgeComponent } from './components/work-group-status-badge/work-group-status-badge.component';
import { WorkGroupExpansionStateService } from './work-group-expansion-state.service';

interface SelectedWorkGroup {
  item: WorkGroupModel;
  kind: WorkGroupKind;
}

@Component({
  selector: 'app-groups-tab',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    HasProjectAccessDirective,
    MenuModule,
    TooltipModule,
    WorkGroupDialogComponent,
    WorkGroupStatusBadgeComponent,
  ],
  templateUrl: './groups-tab.component.html',
  styleUrl: './groups-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupsTabComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly confirmation = inject(ConfirmationService);
  private readonly expansionState = inject(WorkGroupExpansionStateService);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly destroyRef = inject(DestroyRef);
  private knownGroupIds = new Set<string>();
  private hasLoadedGroups = false;
  private hasRestoredExpansionState = false;

  readonly projectId = input.required<string>();
  readonly ProjectPermissions = ProjectPermissions;
  readonly projectPermissions = signal<string[]>([]);
  readonly canEdit = computed(() => this.projectPermissions().includes(ProjectPermissions.Group.Edit));
  readonly canDelete = computed(() => this.projectPermissions().includes(ProjectPermissions.Group.Delete));
  readonly canManage = computed(() => this.canEdit() || this.canDelete());

  readonly groups = this.store.selectSignal(WorkGroupsStoreSelectors.getItems);
  readonly loading = this.store.selectSignal(WorkGroupsStoreSelectors.isLoading);
  readonly saving = this.store.selectSignal(WorkGroupsStoreSelectors.isSaving);
  readonly loadError = this.store.selectSignal(WorkGroupsStoreSelectors.getLoadError);

  readonly expandedGroupIds = signal<Set<string>>(new Set<string>());
  readonly initialLoadComplete = signal(this.groups().length > 0 || this.loadError() !== null);
  readonly showExpansionControls = computed(() => this.groups().length > 3);
  readonly allGroupsExpanded = computed(
    () =>
      this.groups().length > 0 &&
      this.groups().every((group) => this.expandedGroupIds().has(group.id)),
  );
  readonly addMenuWidth = signal('15rem');
  readonly selectedWorkGroup = signal<SelectedWorkGroup | null>(null);
  readonly dialogVisible = signal(false);
  readonly dialogMode = signal<WorkGroupDialogMode>('create');
  readonly dialogKind = signal<WorkGroupKind>('group');
  readonly dialogItem = signal<WorkGroupModel | null>(null);
  readonly dialogParentWorkGroupId = signal<string | null>(null);
  readonly dialogParentLocked = signal(false);

  readonly addActions = computed<MenuItem[]>(() => [
    {
      label: 'Group',
      icon: 'pi pi-folder',
      disabled: this.saving(),
      command: () => this.openCreateDialog('group'),
    },
    {
      label: 'Milestone',
      icon: 'pi pi-flag',
      disabled: this.saving() || this.groups().length === 0,
      command: () => this.openCreateDialog('milestone'),
    },
    {
      separator: true,
    },
    {
      label: 'Ticket — coming soon',
      icon: 'pi pi-ticket',
      disabled: true,
    },
  ]);

  readonly itemActions = computed<MenuItem[]>(() => {
    const selected = this.selectedWorkGroup();
    if (!selected) return [];

    const actions: MenuItem[] = [];
    if (this.canEdit() && selected.kind === 'group') {
      actions.push({
        label: 'Add milestone',
        icon: 'pi pi-plus',
        disabled: this.saving(),
        command: () => this.openCreateDialog('milestone', selected.item.id, true),
      });
      actions.push({ separator: true });
    }

    if (this.canEdit()) {
      actions.push({
        label: 'Edit',
        icon: 'pi pi-pencil',
        disabled: this.saving(),
        command: () => this.openEditDialog(selected),
      });
    }

    if (this.canDelete()) {
      actions.push({
        label: 'Delete',
        icon: 'pi pi-trash',
        styleClass: 'work-groups-menu-danger',
        disabled: this.saving(),
        command: () => this.requestDelete(selected),
      });
    }

    return actions;
  });

  constructor() {
    this.actions$
      .pipe(ofType(WorkGroupsStoreActions.loadWorkGroupsSuccess), takeUntilDestroyed())
      .subscribe(({ projectId, items }) => {
        if (projectId !== this.projectId()) return;
        this.updateExpandedGroups(items);
        this.initialLoadComplete.set(true);
      });

    this.actions$
      .pipe(ofType(WorkGroupsStoreActions.loadWorkGroupsFailure), takeUntilDestroyed())
      .subscribe(({ projectId }) => {
        if (projectId === this.projectId()) this.initialLoadComplete.set(true);
      });

    this.actions$
      .pipe(ofType(WorkGroupsStoreActions.createWorkGroupSuccess), takeUntilDestroyed())
      .subscribe(({ projectId, kind, parentWorkGroupId }) => {
        if (projectId !== this.projectId()) return;

        if (kind === 'milestone' && parentWorkGroupId) {
          this.setExpandedGroups(new Set(this.expandedGroupIds()).add(parentWorkGroupId));
        }

        this.dialogVisible.set(false);
        this.dialogItem.set(null);
      });

    this.actions$
      .pipe(ofType(WorkGroupsStoreActions.updateWorkGroupSuccess), takeUntilDestroyed())
      .subscribe(({ projectId }) => {
        if (projectId !== this.projectId()) return;
        this.dialogVisible.set(false);
        this.dialogItem.set(null);
      });
  }

  ngOnInit(): void {
    this.projectAccess.getPermissions(this.projectId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((permissions) => this.projectPermissions.set(permissions));

    const restoredExpansionState = this.expansionState.get(this.projectId());
    if (restoredExpansionState) {
      this.expandedGroupIds.set(restoredExpansionState);
      this.hasRestoredExpansionState = true;
    }

    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.store.dispatch(WorkGroupsStoreActions.resetWorkGroups());
  }

  loadGroups(): void {
    this.store.dispatch(WorkGroupsStoreActions.loadWorkGroups({ projectId: this.projectId() }));
  }

  toggleGroup(groupId: string): void {
    const next = new Set(this.expandedGroupIds());
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);

    this.setExpandedGroups(next);
  }

  toggleAllGroups(): void {
    const expandedGroupIds = this.allGroupsExpanded()
      ? new Set<string>()
      : new Set(this.groups().map((group) => group.id));

    this.setExpandedGroups(expandedGroupIds);
  }

  isExpanded(groupId: string): boolean {
    return this.expandedGroupIds().has(groupId);
  }

  completedMilestoneCount(group: WorkGroupModel): number {
    return completedMilestoneCount(group);
  }

  openAddMenu(event: Event, menu: Menu): void {
    if (!this.canEdit() || this.saving()) return;

    const trigger = event.currentTarget as HTMLElement | null;
    if (trigger) {
      const triggerWidth = trigger.getBoundingClientRect().width;
      const viewportWidth = trigger.ownerDocument.defaultView?.innerWidth ?? triggerWidth + 32;
      const menuWidth = Math.min(Math.max(triggerWidth, 240), viewportWidth - 32);
      this.addMenuWidth.set(`${Math.round(menuWidth)}px`);
    }

    menu.toggle(event);
  }

  openItemMenu(event: Event, item: WorkGroupModel, kind: WorkGroupKind, menu: Menu): void {
    if (!this.canManage() || this.saving()) return;
    this.selectedWorkGroup.set({ item, kind });
    menu.toggle(event);
  }

  openCreateDialog(
    kind: WorkGroupKind,
    parentWorkGroupId: string | null = null,
    parentLocked = false,
  ): void {
    if (!this.canEdit() || this.saving()) return;
    if (kind === 'milestone' && this.groups().length === 0) return;

    this.dialogMode.set('create');
    this.dialogKind.set(kind);
    this.dialogItem.set(null);
    this.dialogParentWorkGroupId.set(parentWorkGroupId);
    this.dialogParentLocked.set(parentLocked);
    this.dialogVisible.set(true);
  }

  submitDialog(event: WorkGroupDialogSubmitEvent): void {
    if (event.mode === 'create') {
      this.store.dispatch(
        WorkGroupsStoreActions.createWorkGroup({
          projectId: this.projectId(),
          kind: event.kind,
          command:
            event.kind === 'milestone'
              ? {
                  title: event.title,
                  parentWorkGroupId: event.parentWorkGroupId,
                }
              : { title: event.title },
        }),
      );
      return;
    }

    if (!event.workGroupId) return;
    this.store.dispatch(
      WorkGroupsStoreActions.updateWorkGroup({
        projectId: this.projectId(),
        workGroupId: event.workGroupId,
        kind: event.kind,
        command: { title: event.title },
      }),
    );
  }

  private openEditDialog(selected: SelectedWorkGroup): void {
    this.dialogMode.set('edit');
    this.dialogKind.set(selected.kind);
    this.dialogItem.set(selected.item);
    this.dialogParentWorkGroupId.set(selected.item.parentWorkGroupId);
    this.dialogParentLocked.set(true);
    this.dialogVisible.set(true);
  }

  private requestDelete(selected: SelectedWorkGroup): void {
    const blockedReason = workGroupDeleteBlockReason(selected.item, selected.kind);
    if (blockedReason) {
      this.confirmation.confirm({
        key: 'workGroupsDanger',
        header: `This ${selected.kind} can't be deleted yet`,
        message: blockedReason,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Got it',
        rejectVisible: false,
      });
      return;
    }

    this.confirmation.confirm({
      key: 'workGroupsDanger',
      header: `Delete ${selected.kind}?`,
      message: `The ${selected.kind} "${selected.item.title}" will be removed from the plan. This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger work-groups-danger-confirm-button',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.store.dispatch(
          WorkGroupsStoreActions.deleteWorkGroup({
            projectId: this.projectId(),
            workGroupId: selected.item.id,
            kind: selected.kind,
          }),
        );
      },
    });
  }

  private updateExpandedGroups(items: WorkGroupModel[]): void {
    const nextGroupIds = new Set(items.map((item) => item.id));
    const expanded = new Set(
      [...this.expandedGroupIds()].filter((groupId) => nextGroupIds.has(groupId)),
    );

    if (!this.hasLoadedGroups && !this.hasRestoredExpansionState) {
      items.forEach((item) => expanded.add(item.id));
    } else if (this.hasLoadedGroups) {
      items.forEach((item) => {
        if (!this.knownGroupIds.has(item.id)) expanded.add(item.id);
      });
    }

    this.knownGroupIds = nextGroupIds;
    this.hasLoadedGroups = true;
    this.setExpandedGroups(expanded);
  }

  private setExpandedGroups(expandedGroupIds: Set<string>): void {
    this.expandedGroupIds.set(expandedGroupIds);
    this.expansionState.set(this.projectId(), expandedGroupIds);
  }
}

export function completedMilestoneCount(group: WorkGroupModel): number {
  return group.milestones.filter(
    (milestone) => milestone.status.code.trim().toLowerCase() === 'done',
  ).length;
}

export function workGroupDeleteBlockReason(
  item: WorkGroupModel,
  kind: WorkGroupKind,
): string | null {
  if (kind === 'milestone') {
    return item.ticketCount > 0
      ? `Before deleting "${item.title}", remove ${formatCount(item.ticketCount, 'ticket')} from this milestone.`
      : null;
  }

  const milestoneCount = item.milestones.length;
  const ticketCount =
    item.ticketCount +
    item.milestones.reduce((total, milestone) => total + milestone.ticketCount, 0);
  if (milestoneCount === 0 && ticketCount === 0) return null;

  const contents = [
    milestoneCount > 0 ? formatCount(milestoneCount, 'milestone') : null,
    ticketCount > 0 ? formatCount(ticketCount, 'ticket') : null,
  ].filter((value): value is string => Boolean(value));

  return `Before deleting "${item.title}", remove its ${contents.join(' and ')}.`;
}

function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`;
}
