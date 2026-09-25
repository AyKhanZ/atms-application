import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { WorkItemJumpItem } from './work-item-jump-item';
import { WorkItemJumpContext } from './work-item-jump-context';
import { workItemJumpPosition } from './work-item-jump-position';
import { InputClearComponent } from '../input-clear/input-clear.component';
import { LoadMoreButtonComponent } from '../load-more-button/load-more-button.component';
import { WorkItemRefComponent } from '../work-item-ref/work-item-ref.component';
import { WorkItemKind } from '../../../core/models/work-items';

@Component({
  selector: 'app-work-item-jump',
  imports: [InputClearComponent, LoadMoreButtonComponent, WorkItemRefComponent],
  templateUrl: './work-item-jump.component.html',
  styleUrl: './work-item-jump.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemJumpComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  readonly current = input.required<WorkItemJumpItem>();
  readonly items = input.required<WorkItemJumpItem[]>();
  readonly groupLabel = input.required<string>();
  /** Ancestors of the listed items, outermost first. Rendered as the panel header. */
  readonly context = input<readonly WorkItemJumpContext[]>([]);
  /** Not shown any more — the trigger reads as a select on its own. Kept for assistive tech. */
  readonly label = input('Switch item');
  /** Kind of the entity being switched: its icon and colour, so the trigger reads as one more
   *  tree level and matches the same item everywhere else. */
  readonly kind = input(WorkItemKind.Ticket);
  readonly loading = input(false);
  readonly loadError = input(false);
  readonly initialized = input(true);
  readonly hasMore = input(false);
  readonly searchTerm = input('');
  readonly selected = output<string>();
  readonly searchChanged = output<string>();
  readonly more = output<void>();
  readonly retry = output<void>();
  readonly open = signal(false);
  /** Same threshold the select overlays use: under it the panel is a sheet, not a pointer. */
  private static readonly sheetBreakpoint = 768;
  readonly sheet = signal(false);
  ngOnInit(): void {
    const onScroll = (event: Event) => {
      if (this.open() && !this.panel()?.nativeElement.contains(event.target as Node)) this.close();
    };
    document.addEventListener('scroll', onScroll, true);
    this.destroyRef.onDestroy(() => document.removeEventListener('scroll', onScroll, true));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();
    this.close(true);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.close();
  }

  @HostListener('document:focusin', ['$event'])
  onFocusOutside(event: FocusEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) this.close();
  }

  close(restoreFocus = false): void {
    const panel = this.panel()?.nativeElement;
    if (panel?.matches(':popover-open')) panel.hidePopover();
    this.open.set(false);

    if (restoreFocus) this.trigger()?.nativeElement.focus({ preventScroll: true });
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    const trigger = this.trigger()?.nativeElement;
    const panel = this.panel()?.nativeElement;
    if (!trigger || !panel) return;
    const anchor = trigger.getBoundingClientRect();
    const viewport = {
      // clientWidth, not innerWidth: innerWidth counts the scrollbar, so the panel was laid out
      // 15px wider than the visible area and its right edge ended up under the scrollbar.
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
      topInset: document.querySelector('app-topbar')?.getBoundingClientRect().bottom ?? 0,
    };
    const sheet = viewport.width <= WorkItemJumpComponent.sheetBreakpoint;
    this.sheet.set(sheet);

    if (sheet) {
      // A sheet is placed by the stylesheet, so anything measured earlier has to go — otherwise
      // a width from a wider window survives the resize and the sheet comes up narrow.
      for (const property of ['width', 'maxHeight', 'left', 'top']) {
        panel.style.removeProperty(property.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()));
      }
      panel.showPopover();
      this.open.set(true);
      this.search()?.nativeElement.focus({ preventScroll: true });
      return;
    }

    const placement = workItemJumpPosition(anchor, viewport);
    panel.style.width = placement.width + 'px';
    panel.style.maxHeight = placement.maxHeight + 'px';
    // Native top-layer rendering avoids clipping and does not enlarge the page's scroll area.
    panel.showPopover();
    const position = workItemJumpPosition(anchor, viewport, panel.getBoundingClientRect().height);
    panel.style.left = position.left + 'px';
    panel.style.top = position.top + 'px';
    this.open.set(true);
    this.search()?.nativeElement.focus({ preventScroll: true });
  }

  navigateOptions(event: KeyboardEvent): void {
    const panel = this.panel()?.nativeElement;
    if (!panel || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const options = Array.from(panel.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    if (!options.length) return;
    const index = options.findIndex((option) => option === document.activeElement);
    if (index < 0 && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? options.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1) % options.length
            : index < 0
              ? options.length - 1
              : (index - 1 + options.length) % options.length;
    options[next].focus({ preventScroll: true });
    options[next].scrollIntoView({ block: 'nearest' });
  }
  choose(id: string): void {
    this.close(true);
    if (id !== this.current().id) this.selected.emit(id);
  }

  clearSearch(): void {
    this.searchChanged.emit('');
    this.search()?.nativeElement.focus({ preventScroll: true });
  }

  updateSearch(event: Event): void {
    this.searchChanged.emit((event.target as HTMLInputElement).value);
  }
}
