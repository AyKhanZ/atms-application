import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HistoryEntityType } from '../../../../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../../../../core/enums/history-field.enum';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { HistoryStateModel } from '../../../../../core/models/history';
import { HistoryTimePipe } from '../../../../../shared/pipes/history.pipe';
import { PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { HistoryAuthorAvatarComponent } from '../history-author-avatar/history-author-avatar.component';
import { HistoryValueComponent } from '../history-value/history-value.component';

/** A phone shows the newest three; the rest wait behind "Show N earlier". */
const PHONE_STATES = 3;

interface StateStep {
  state: HistoryStateModel;
  /** Above the arrow: "Created", "Moved to In Review". */
  label: string;
  current: boolean;
}

/**
 * How the status went from the first to the current one, with who moved it and when. On a wide tab one line that
 * scrolls sideways: an item moved back and forth twenty times keeps the same height, and the line
 * opens scrolled to its end, where the current status is. On a phone a column from the newest down.
 */
@Component({
  selector: 'app-history-state-bar',
  imports: [HistoryAuthorAvatarComponent, HistoryTimePipe, HistoryValueComponent, PersonNamePipe],
  templateUrl: './history-state-bar.component.html',
  styleUrl: './history-state-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryStateBarComponent {
  protected readonly statusField = HistoryField.Status;

  readonly states = input<HistoryStateModel[] | null>(null);
  readonly entityType = input.required<HistoryEntityType>();
  readonly projectId = input.required<string>();
  /** Shown alone when no status change was ever recorded. */
  readonly current = input<DictionaryModel | null>(null);

  protected readonly phoneStates = PHONE_STATES;
  readonly expanded = signal(false);

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  readonly steps = computed<StateStep[]>(() => {
    const recorded = this.states();
    const current = this.current();
    const states: HistoryStateModel[] = recorded?.length
      ? recorded
      : current
        ? [{ status: { id: String(current.id), code: current.code, name: current.name } }]
        : [];

    return states.map((state, index) => ({
      state,
      label: stepLabel(state, index, !!recorded?.length),
      current: index === states.length - 1,
    }));
  });
  readonly hiddenOnPhone = computed(() =>
    this.expanded() ? 0 : Math.max(this.steps().length - PHONE_STATES, 0),
  );

  constructor() {
    afterRenderEffect(() => {
      this.steps();
      const track = this.track()?.nativeElement;
      if (track) track.scrollLeft = track.scrollWidth;
    });
  }
}

function stepLabel(state: HistoryStateModel, index: number, recorded: boolean): string {
  if (!recorded) return 'Current';
  if (index === 0) return state.changedAt ? 'Created' : 'Earlier';
  return `Moved to ${state.status.name || 'Unknown'}`;
}
