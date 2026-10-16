import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { BoardCellView, CellState } from '../../../models/jeopardy.models';
import { BoardGridComponent } from './board-grid.component';

function cell(category: string, row: number, state: CellState = 'HIDDEN'): BoardCellView {
  return { cellId: `r1|${category}|${row}`, category, value: (row + 1) * 200, state };
}

function boardOf(...categories: string[]): BoardCellView[] {
  return categories.flatMap((category) => [0, 1, 2, 3, 4].map((row) => cell(category, row)));
}

describe('BoardGridComponent', () => {
  let fixture: ComponentFixture<BoardGridComponent>;
  let component: BoardGridComponent;

  function render(board: BoardCellView[], interactive: boolean): void {
    fixture.componentRef.setInput('board', board);
    fixture.componentRef.setInput('interactive', interactive);
    fixture.detectChanges();
  }

  function tiles(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button.board__tile'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BoardGridComponent],
      providers: [provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      'jeopardy.cellAriaLabel': '{{category}} for {{value}}',
      'jeopardy.cellAnsweredAriaLabel': '{{category}} for ${{value}}, already played',
    });
    translate.use('en');
    fixture = TestBed.createComponent(BoardGridComponent);
    component = fixture.componentInstance;
  });

  it('renders one column per category, each with its five clue values in row order', () => {
    render(boardOf('History', 'Science'), false);

    const columns = fixture.nativeElement.querySelectorAll('.board__column');
    expect(columns.length).toBe(2);
    expect(columns[0].getAttribute('aria-label')).toBe('History');
    const values = Array.from(columns[1].querySelectorAll('.board__value')).map((el) => (el as HTMLElement).textContent?.trim());
    expect(values).toEqual(['$200', '$400', '$600', '$800', '$1,000']);
  });

  it('keeps played tiles on the board, disabled and labelled as already played', () => {
    const board = boardOf('History');
    board[2] = cell('History', 2, 'ANSWERED');
    render(board, true);

    const played = tiles()[2];
    expect(played.classList).toContain('board__tile--used');
    expect(played.disabled).toBeTrue();
    expect(played.getAttribute('aria-label')).toBe('History for $600, already played');
  });

  it('emits the picked cell once, ignoring a double-tap while the clue loads', () => {
    render(boardOf('History'), true);
    const emitted: string[] = [];
    component.cellSelected.subscribe((id) => emitted.push(id));

    tiles()[1].click();
    tiles()[3].click();
    fixture.detectChanges();

    expect(emitted).toEqual(['r1|History|1']);
    expect(tiles()[1].classList).toContain('board__tile--selecting');
  });

  it('never emits from a read-only board', () => {
    render(boardOf('History'), false);
    const emitted: string[] = [];
    component.cellSelected.subscribe((id) => emitted.push(id));

    component.select(component.board[0]);

    expect(emitted).toEqual([]);
    expect(tiles().every((tile) => tile.disabled)).toBeTrue();
  });
});
