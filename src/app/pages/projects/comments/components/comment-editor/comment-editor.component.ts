import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { Subject, catchError, debounceTime, defer, map, of, shareReplay, switchMap } from 'rxjs';
import { CommentReferenceModel } from '../../../../../core/models/comments';
import { GlobalSearchService } from '../../../../../core/services/global-search.service';
import {
  EditorTrigger,
  TextEdit,
  continueList,
  findTrigger,
  indentList,
  insertLink,
  insertTriggerChar,
  mentionLabel,
  mentionsToNames,
  mentionsToTokens,
  replaceTrigger,
  toggleCheck,
  toggleHighlight,
  toggleList,
  toggleWrap,
} from '../../../../../core/utils/comment-editor.utils';
import { HighlightColor } from '../../../../../core/utils/comment-markdown.utils';
import {
  CommentSuggestion,
  MentionCandidate,
  isSearchable,
  personSuggestions,
  referenceOf,
  workSuggestions,
} from '../../comment-suggestion';
import { CommentSuggestionsComponent } from '../comment-suggestions/comment-suggestions.component';
import { CommentTextComponent } from '../comment-text/comment-text.component';
import {
  CommentFormat,
  CommentToolbarComponent,
} from '../comment-toolbar/comment-toolbar.component';

let nextEditorId = 0;

// field shows names and sends @[user:id] tokens
@Component({
  selector: 'app-comment-editor',
  imports: [
    ButtonModule,
    CommentSuggestionsComponent,
    CommentTextComponent,
    CommentToolbarComponent,
    TextareaModule,
  ],
  templateUrl: './comment-editor.component.html',
  styleUrl: './comment-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-active]': 'active()' },
})
export class CommentEditorComponent implements OnInit {
  private readonly search = inject(GlobalSearchService);
  private readonly destroyRef = inject(DestroyRef);

  readonly people = input<readonly MentionCandidate[]>([]);
  readonly initialText = input('');
  readonly placeholder = input(
    'Add a comment. Use @ to mention a person or # to link a ticket or task.',
  );
  readonly submitLabel = input('Save');
  readonly label = input('Comment');
  // an edit opens ready to type, a new comment waits at rest
  readonly expanded = input(false);
  // own project work is listed under # without the project name
  readonly projectId = input<string | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private readonly toolbar = viewChild(CommentToolbarComponent);

  protected readonly id = `comment-editor-${nextEditorId++}`;
  protected readonly text = signal('');
  private readonly focused = signal(false);
  // "@Ann Lee" -> id
  private readonly mentions = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly trigger = signal<EditorTrigger | null>(null);
  protected readonly activeIndex = signal(0);
  protected readonly searching = signal(false);
  private readonly workResults = signal<CommentSuggestion[]>([]);
  private readonly workQuery$ = new Subject<string>();
  // read once per field, an empty or short # lists them
  private readonly recent$ = defer(() => this.search.recent()).pipe(shareReplay(1));

  // so the preview draws it as the badge the saved comment will show
  private readonly picked = signal<ReadonlyMap<string, CommentReferenceModel>>(new Map());

  protected readonly active = computed(() => this.expanded() || this.focused() || !!this.text());
  // as the server counts it, with markup and tokens
  protected readonly stored = computed(() => mentionsToTokens(this.text(), this.mentions()));
  // 2000 stored chars, a mention takes more room stored than shown so the difference is taken off here
  protected readonly maxLength = computed(() => 2000 - (this.stored().length - this.text().length));
  protected readonly canSubmit = computed(
    () => !!this.text().trim() && this.stored().length <= 2000 && !this.busy(),
  );
  protected readonly previewPeople = computed(() => {
    const ids = new Set(this.mentions().values());
    return this.people().filter((person) => ids.has(person.id));
  });
  protected readonly previewReferences = computed(() => [...this.picked().values()]);
  protected readonly suggestions = computed<readonly CommentSuggestion[]>(() => {
    const trigger = this.trigger();
    if (!trigger) return [];
    return trigger.char === '@'
      ? personSuggestions(this.people(), trigger.query)
      : this.workResults();
  });

  constructor() {
    this.workQuery$
      .pipe(
        debounceTime(200),
        switchMap((query) =>
          (isSearchable(query) ? this.search.search(query, 5) : this.recent$).pipe(
            map((result) => workSuggestions(result, query)),
            catchError(() => of([])),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.workResults.set(items);
        this.searching.set(false);
        this.activeIndex.set(0);
      });
  }

  ngOnInit(): void {
    const shown = mentionsToNames(this.initialText(), this.people());
    this.mentions.set(shown.mentions);
    this.text.set(shown.text);
    if (this.expanded()) {
      queueMicrotask(() => {
        this.fit();
        this.place(shown.text.length, shown.text.length);
      });
    }
  }

  reset(): void {
    this.mentions.set(new Map());
    this.picked.set(new Map());
    this.text.set('');
    this.field().nativeElement.value = '';
    this.closeSuggestions();
    this.fit();
  }

  protected onFocusIn(): void {
    this.focused.set(true);
  }

  // focus moving to the toolbar or buttons keeps it open
  protected onFocusOut(event: FocusEvent): void {
    if (this.host.nativeElement.contains(event.relatedTarget as Node | null)) return;
    this.focused.set(false);
    this.toolbar()?.closePalette();
    this.closeSuggestions();
  }

  protected onInput(): void {
    this.text.set(this.field().nativeElement.value);
    this.fit();
    this.readTrigger();
  }

  protected readTrigger(): void {
    const element = this.field().nativeElement;
    const trigger =
      element.selectionStart === element.selectionEnd
        ? findTrigger(element.value, element.selectionStart)
        : null;
    const previous = this.trigger();
    this.trigger.set(trigger);
    // a click or arrow key lands here too, only a changed query searches
    if (!trigger || (previous?.char === trigger.char && previous.query === trigger.query)) return;

    this.activeIndex.set(0);
    if (trigger.char === '#') {
      if (previous?.char !== '#') this.workResults.set([]);
      this.searching.set(true);
      this.workQuery$.next(trigger.query.trim());
    }
  }

  protected onKeyup(event: KeyboardEvent): void {
    const inList = event.key === 'ArrowUp' || event.key === 'ArrowDown';
    if (inList && this.trigger() && this.suggestions().length) return;
    if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') {
      this.readTrigger();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.suggestions().length;
    if (this.trigger() && count && this.moveInList(event, count)) return;

    if (event.key === 'Escape') {
      event.stopPropagation();
      if (this.trigger()) this.closeSuggestions();
      else this.cancel();
      return;
    }

    // tab on a list line indents, elsewhere it moves focus as usual
    if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const next = indentList(this.currentEdit(), event.shiftKey ? -1 : 1);
      if (next) {
        event.preventDefault();
        this.apply(next);
      }
      return;
    }

    const plainEnter = event.key === 'Enter' && !event.shiftKey && !event.altKey;
    if (plainEnter && !event.ctrlKey && !event.metaKey) {
      const next = continueList(this.currentEdit());
      if (next) {
        event.preventDefault();
        this.apply(next);
      }
      return;
    }

    if (!(event.ctrlKey || event.metaKey)) return;
    const shortcut: Partial<Record<string, CommentFormat>> = { b: 'bold', i: 'italic', k: 'link' };
    const key = event.key.toLowerCase();
    if (key === 'enter') {
      event.preventDefault();
      this.submit();
    } else if (shortcut[key]) {
      event.preventDefault();
      this.format(shortcut[key]);
    }
  }

  protected format(kind: CommentFormat): void {
    const edit = this.currentEdit();
    switch (kind) {
      case 'bold':
        return this.apply(toggleWrap(edit, '**', 'bold text'));
      case 'italic':
        return this.apply(toggleWrap(edit, '_', 'italic text'));
      case 'code':
        return this.apply(toggleWrap(edit, '`', 'code'));
      case 'link':
        return this.apply(insertLink(edit));
      default:
        return this.apply(toggleList(edit, kind));
    }
  }

  protected highlight(color: HighlightColor): void {
    this.apply(toggleHighlight(this.currentEdit(), color));
  }

  // no [x] to know by heart
  protected toggleCheckInText(line: number): void {
    const { selectionStart, selectionEnd } = this.currentEdit();
    this.apply({ text: toggleCheck(this.text(), line), selectionStart, selectionEnd });
  }

  protected insertTrigger(char: '@' | '#'): void {
    this.apply(insertTriggerChar(this.currentEdit(), char));
    this.readTrigger();
  }

  protected pick(index: number): void {
    const trigger = this.trigger();
    const suggestion = this.suggestions()[index];
    if (!trigger || !suggestion) return;

    let insertion: string;
    if (suggestion.kind === 'person') {
      insertion = mentionLabel(suggestion.person);
      const id = suggestion.person.id;
      this.mentions.update((mentions) => new Map([...mentions, [insertion, id]]));
    } else {
      const reference = referenceOf(suggestion.item);
      insertion = `#${reference.code}`;
      this.picked.update((picked) => new Map([...picked, [reference.code, reference]]));
    }
    this.apply(replaceTrigger(this.currentEdit(), trigger, insertion));
    this.closeSuggestions();
  }

  protected submit(): void {
    if (!this.canSubmit()) return;
    this.submitted.emit(this.stored().trim());
  }

  protected cancel(): void {
    if (!this.expanded()) {
      this.reset();
      this.field().nativeElement.blur();
      this.focused.set(false);
    }
    this.cancelled.emit();
  }

  protected closeSuggestions(): void {
    this.trigger.set(null);
  }

  private moveInList(event: KeyboardEvent, count: number): boolean {
    switch (event.key) {
      case 'ArrowDown':
        this.activeIndex.update((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        this.activeIndex.update((index) => (index - 1 + count) % count);
        break;
      case 'Enter':
      case 'Tab':
        if (event.ctrlKey || event.metaKey) return false;
        this.pick(this.activeIndex());
        break;
      default:
        return false;
    }
    event.preventDefault();
    return true;
  }

  private currentEdit(): TextEdit {
    const element = this.field().nativeElement;
    return {
      text: element.value,
      selectionStart: element.selectionStart,
      selectionEnd: element.selectionEnd,
    };
  }

  // an edit over 2000 stored chars is not made, like typing
  private apply(edit: TextEdit): void {
    if (mentionsToTokens(edit.text, this.mentions()).length > 2000) return;
    this.field().nativeElement.value = edit.text;
    this.text.set(edit.text);
    this.fit();
    this.place(edit.selectionStart, edit.selectionEnd);
  }

  private place(start: number, end: number): void {
    const element = this.field().nativeElement;
    element.focus();
    element.setSelectionRange(start, end);
  }

  private fit(): void {
    const element = this.field().nativeElement;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }
}
