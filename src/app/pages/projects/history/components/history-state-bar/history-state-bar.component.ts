import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HistoryEntityType } from '../../../../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../../../../core/enums/history-field.enum';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { HistoryStateModel } from '../../../../../core/models/history';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { currentLanguage } from '../../../../../core/i18n/active-language';
import { historyStateLabel } from '../../../../../core/utils/history.utils';
import { HistoryTimePipe } from '../../../../../shared/pipes/history.pipe';
import { PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { HistoryAuthorAvatarComponent } from '../history-author-avatar/history-author-avatar.component';
import { HistoryValueComponent } from '../history-value/history-value.component';

const PHONE_STATES = 3;

interface StateStep {
  state: HistoryStateModel;
  // "Created", "Moved to In Review"
  label: string;
  current: boolean;
}

// wide: one line scrolled to the end, so 20 moves back and forth keep the same height; phone: a column
@Component({
  selector: 'app-history-state-bar',
  imports: [
    HistoryAuthorAvatarComponent,
    HistoryTimePipe,
    HistoryValueComponent,
    PersonNamePipe,
    TranslocoDirective,
  ],
  templateUrl: './history-state-bar.component.html',
  styleUrl: './history-state-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryStateBarComponent {
  private readonly transloco = inject(TranslocoService);

  protected readonly statusField = HistoryField.Status;

  readonly states = input<HistoryStateModel[] | null>(null);
  readonly entityType = input.required<HistoryEntityType>();
  readonly projectId = input.required<string>();
  // shown alone when no status change was recorded
  readonly current = input<DictionaryModel | null>(null);

  protected readonly phoneStates = PHONE_STATES;
  readonly expanded = signal(false);

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  readonly steps = computed<StateStep[]>(() => {
    currentLanguage();
    const recorded = this.states();
    const current = this.current();
    const states: HistoryStateModel[] = recorded?.length
      ? recorded
      : current
        ? [{ status: { id: String(current.id), code: current.code, name: current.name } }]
        : [];

    return states.map((state, index) => ({
      state,
      label: historyStateLabel(state, index, !!recorded?.length, (key, params) =>
        this.transloco.translate(key, params),
      ),
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
