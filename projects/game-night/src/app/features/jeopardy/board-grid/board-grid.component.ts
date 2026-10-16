import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BoardCellView } from '../../../models/jeopardy.models';
import { boardCategories } from '../jeopardy-display';
import { MoneyPipe } from '../money.pipe';

/** How long a tapped tile shows its "selected" flash before it can be tapped again. */
const SELECT_LOCK_MS = 1500;

@Component({
  selector: 'app-board-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyPipe],
  templateUrl: './board-grid.component.html',
  styleUrl: './board-grid.component.scss',
})
export class BoardGridComponent {
  private readonly translate = inject(TranslateService);

  @Input({ required: true }) board: BoardCellView[] = [];
  /** When false, cells render as a read-only display (e.g. the shared TV board). */
  @Input() interactive = false;
  /** Plays the tile-fill cascade when the board renders - the TV board uses it to open each round. */
  @Input() cascade = false;
  @Output() cellSelected = new EventEmitter<string>();

  readonly rows = [0, 1, 2, 3, 4];

  /** The tile just tapped: it flashes, and further taps are ignored until the clue screen takes over. */
  readonly selectingId = signal<string | null>(null);
  private selectTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.selectTimer));
  }

  get categories(): string[] {
    return boardCategories(this.board);
  }

  cellAriaLabel(cell: BoardCellView): string {
    const key = cell.state === 'ANSWERED' ? 'jeopardy.cellAnsweredAriaLabel' : 'jeopardy.cellAriaLabel';
    return this.translate.instant(key, { category: cell.category, value: cell.value });
  }

  cellFor(category: string, row: number): BoardCellView | undefined {
    return this.board.find((c) => c.category === category && c.cellId.endsWith('|' + row));
  }

  /** Staggered, scattered fill order - reads as a board "lighting up" rather than a left-to-right wipe. */
  cascadeDelay(column: number, row: number): string {
    return `${((column * 5 + row * 3) % 8) * 55 + 150}ms`;
  }

  select(cell: BoardCellView): void {
    if (!this.interactive || cell.state !== 'HIDDEN' || this.selectingId()) {
      return;
    }
    this.selectingId.set(cell.cellId);
    this.cellSelected.emit(cell.cellId);
    clearTimeout(this.selectTimer);
    this.selectTimer = setTimeout(() => this.selectingId.set(null), SELECT_LOCK_MS);
  }
}
