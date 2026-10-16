import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  QueryList,
  SimpleChanges,
  ViewChildren,
  computed,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PuzzleCell, layoutPuzzle } from './puzzle-layout';

type CellKind = 'empty' | 'hidden' | 'filled';

/** Flashes the board's frame: green for a solve, red for a miss. */
export type PuzzleBoardFlash = 'correct' | 'wrong';

@Component({
  selector: 'app-puzzle-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './puzzle-board.component.html',
  styleUrl: './puzzle-board.component.scss',
})
export class PuzzleBoardComponent implements OnChanges {
  private readonly templateSignal = signal('');

  @Input({ required: true }) set template(value: string) {
    this.templateSignal.set(value ?? '');
    this.reconcileLetterControls();
  }

  /** Shown in the strip under the board, the way the show captions the puzzle. Omitted when empty. */
  @Input() category: string | null = null;

  /** When true, every still-hidden cell renders an editable single-letter box instead of a plain
   *  blank tile - the player is actively attempting to solve. Filling the last box never submits
   *  anything: a parent sends {@link currentGuess} from its own Submit button. */
  @Input() solving = false;

  /** Flashes the frame while set - Fortune Frenzy's green for a solve, red for a miss. */
  @Input() flash: PuzzleBoardFlash | null = null;

  /** The inner horizontal lines of the frame flash red - the last seconds of Fortune Frenzy. */
  @Input() alert = false;

  @ViewChildren('letterInput') private letterInputs?: QueryList<ElementRef<HTMLInputElement>>;

  private readonly letterControls = new Map<number, FormControl<string>>();
  private readonly allFilled = signal(false);

  /** Whether every letter box currently holds a letter - what a parent's Submit button waits on. */
  readonly allLettersFilled = this.allFilled.asReadonly();

  readonly rows = computed<PuzzleCell[][]>(() => layoutPuzzle(this.templateSignal()));

  /** Every currently-hidden cell's template index, in the same left-to-right/top-to-bottom visual
   *  order the boxes render in - matches the order @ViewChildren collects the real <input>
   *  elements, so position N here is always the same box as position N in letterInputs. */
  readonly orderedHiddenIndices = computed<number[]>(() => {
    const indices: number[] = [];
    for (const row of this.rows()) {
      for (const cell of row) {
        if (cell.templateIndex !== null && this.cellKind(cell) === 'hidden') {
          indices.push(cell.templateIndex);
        }
      }
    }
    return indices;
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('solving' in changes) {
      if (this.solving) {
        this.reconcileLetterControls();
      } else {
        this.letterControls.clear();
        this.allFilled.set(false);
      }
    }
  }

  cellKind(cell: PuzzleCell): CellKind {
    if (cell.char === null || cell.char === ' ') {
      return 'empty';
    }
    return cell.char === '_' ? 'hidden' : 'filled';
  }

  cellText(cell: PuzzleCell): string {
    return cell.char && cell.char !== '_' ? cell.char : '';
  }

  controlFor(templateIndex: number): FormControl<string> {
    // reconcileLetterControls() always creates one for every currently-hidden index before the
    // template re-renders, so this is never missing while `solving` is true.
    return this.letterControls.get(templateIndex)!;
  }

  onLetterInput(templateIndex: number): void {
    const control = this.letterControls.get(templateIndex);
    if (!control) {
      return;
    }
    const normalized = control.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
    if (normalized !== control.value) {
      control.setValue(normalized, { emitEvent: false });
    }
    if (normalized) {
      this.focusRelative(templateIndex, 1);
    }
    this.refreshAllFilled();
  }

  onLetterBackspace(templateIndex: number): void {
    const control = this.letterControls.get(templateIndex);
    if (control && !control.value) {
      this.focusRelative(templateIndex, -1);
    }
  }

  /** The full-length guess as it stands right now (template shape preserved, still-blank boxes as
   *  '_') - for a parent's manual "submit" button. */
  currentGuess(): string {
    const template = this.templateSignal();
    let result = '';
    for (let i = 0; i < template.length; i++) {
      const control = this.letterControls.get(i);
      result += control ? control.value || '_' : template[i];
    }
    return result;
  }

  private focusRelative(fromTemplateIndex: number, delta: number): void {
    const order = this.orderedHiddenIndices();
    const position = order.indexOf(fromTemplateIndex);
    const target = position + delta;
    if (position < 0 || target < 0 || target >= order.length) {
      return;
    }
    this.letterInputs?.toArray()[target]?.nativeElement.focus();
  }

  private refreshAllFilled(): void {
    const order = this.orderedHiddenIndices();
    this.allFilled.set(order.length > 0 && order.every((index) => !!this.letterControls.get(index)?.value));
  }

  /** Keeps letterControls in sync with which template indices are currently hidden: creates a
   *  fresh control for a newly-hidden index, and drops one the instant its letter gets revealed
   *  out from under the player (defensive - the server pauses Frenzy/Triple-Toss-Up reveals while
   *  someone is answering) - every other box's control identity and typed value is untouched. */
  private reconcileLetterControls(): void {
    if (!this.solving) {
      return;
    }
    const hiddenIndices = new Set(this.orderedHiddenIndices());
    for (const key of Array.from(this.letterControls.keys())) {
      if (!hiddenIndices.has(key)) {
        this.letterControls.delete(key);
      }
    }
    for (const index of hiddenIndices) {
      if (!this.letterControls.has(index)) {
        this.letterControls.set(index, new FormControl('', { nonNullable: true }));
      }
    }
    this.refreshAllFilled();
  }
}
