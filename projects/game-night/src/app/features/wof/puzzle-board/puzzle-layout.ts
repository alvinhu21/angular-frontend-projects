/*
 * Puzzle board layout.
 *
 * The real modern (1997-present) electronic board: 4 rows of 12/14/14/12 spaces = 52 total,
 * matching the Puzzle entity's own 52-character max length exactly. The narrower top/bottom rows
 * relative to the two full-width middle rows are what give the board its notched silhouette - no
 * artificial corner-cutout is needed, this row-width variation *is* the real shape.
 *
 * Columns: placement is worked out in "board columns" 0-13, the coordinates of the two full-width
 * middle rows. The rows render centered, so a 12-wide row is inset one space on each side and its
 * own column c sits directly under board column c + 1.
 *
 * Placement follows the show's conventions:
 * - Lines are left-justified against one shared edge (the first letter of every line sits in the
 *   same board column), and that block as a whole is centered on the board.
 * - The full-width rows have an even number of spaces, so a block of odd width can't sit dead
 *   center - it's bumped one space to the right. The same holds for the 12-wide rows.
 * - The text uses the fewest rows it fits in, drawn from the vertical middle of the board, breaking
 *   lines so they CAN share an edge: a line that fills a full-width row edge to edge can't line up
 *   with one on a 12-wide row, so "MISSING THE / FOREST FOR THE / TREES" becomes
 *   "MISSING THE / FOREST FOR / THE TREES". Only text with no such break is left staggered.
 */

export const PUZZLE_ROW_WIDTHS: readonly number[] = [12, 14, 14, 12];

const BOARD_COLUMNS = Math.max(...PUZZLE_ROW_WIDTHS);

export interface PuzzleCell {
  char: string | null;
  /** Absolute index into the puzzle template string this cell renders, or null for a padding
   *  cell introduced by the layout (never real puzzle content). */
  templateIndex: number | null;
}

/** One wrapped line: a verbatim slice of the template, starting at `start`. */
interface PuzzleLine {
  start: number;
  text: string;
}

/** A space-delimited word, as a [start, end) span of the template. */
interface WordSpan {
  start: number;
  end: number;
}

/** Lays a puzzle template out on the board: always the full 12/14/14/12 grid, with every
 *  template character (bar the spaces a line break swallows) in exactly one cell. */
export function layoutPuzzle(template: string): PuzzleCell[][] {
  if (!template) {
    return [];
  }

  const lines = chooseLines(template);
  const firstRow = Math.max(0, Math.floor((PUZZLE_ROW_WIDTHS.length - lines.length) / 2));
  // Text too long for the board (the server's 52-character cap rules this out, but word breaks
  // waste space) spills into extra full-width rows rather than silently dropping letters.
  const rowCount = Math.max(PUZZLE_ROW_WIDTHS.length, firstRow + lines.length);
  const rowWidths = Array.from({ length: rowCount }, (_, row) => PUZZLE_ROW_WIDTHS[row] ?? BOARD_COLUMNS);
  const lineWidths = lines.map((_, i) => rowWidths[firstRow + i]);
  const startColumns = lineStartColumns(lines, lineWidths);

  return rowWidths.map((width, row) => {
    const lineIndex = row - firstRow;
    const line = lines[lineIndex] ?? null;
    return rowCells(width, line, line ? startColumns[lineIndex] : 0);
  });
}

function centeredRowWidths(count: number): number[] {
  const firstRow = Math.floor((PUZZLE_ROW_WIDTHS.length - count) / 2);
  return PUZZLE_ROW_WIDTHS.slice(firstRow, firstRow + count);
}

/** Tries 1, 2, 3 then 4 rows (each drawn from the vertical middle of the board) and keeps the
 *  first wrap whose lines fit AND can share a left edge. Text that can't be broken that way at
 *  any row count falls back to a plain greedy wrap in the fewest rows. */
function chooseLines(template: string): PuzzleLine[] {
  const words = wordSpans(template);
  for (let count = 1; count <= PUZZLE_ROW_WIDTHS.length; count++) {
    const lines = alignableWrap(template, words, centeredRowWidths(count));
    if (lines) {
      return lines;
    }
  }
  return greedyWrapIntoFewestRows(template);
}

function wordSpans(template: string): WordSpan[] {
  const spans: WordSpan[] = [];
  for (const match of template.matchAll(/[^ ]+/g)) {
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

/** Breaks the words into exactly one line per row width, such that every line fits its row and
 *  the lines can share a left edge - or null if no break does. Tries the longest first line
 *  first (then the longest second, ...), so the result is the plain greedy wrap whenever that
 *  one aligns. At most 4 lines of whole words, so the search stays tiny. */
function alignableWrap(template: string, words: WordSpan[], widths: number[]): PuzzleLine[] | null {
  const lines: PuzzleLine[] = [];
  const placeFrom = (firstWord: number): boolean => {
    if (firstWord === words.length) {
      return lines.length === widths.length && hasSharedEdge(lines, widths);
    }
    if (lines.length === widths.length) {
      return false;
    }
    const start = words[firstWord].start;
    for (let lastWord = words.length - 1; lastWord >= firstWord; lastWord--) {
      const end = words[lastWord].end;
      if (end - start > widths[lines.length]) {
        continue;
      }
      lines.push({ start, text: template.slice(start, end) });
      if (placeFrom(lastWord + 1)) {
        return true;
      }
      lines.pop();
    }
    return false;
  };
  return placeFrom(0) ? lines : null;
}

function greedyWrapIntoFewestRows(template: string): PuzzleLine[] {
  let lines: PuzzleLine[] = [];
  for (let count = 1; count <= PUZZLE_ROW_WIDTHS.length; count++) {
    lines = greedyWrap(template, centeredRowWidths(count));
    if (lines.length <= count) {
      return lines;
    }
  }
  return lines;
}

/** Greedy word wrap where each line in sequence may have a DIFFERENT capacity (the last one
 *  repeats). Lines are verbatim slices of the template, so each keeps its absolute start index;
 *  a word longer than a whole row is split across rows. */
function greedyWrap(template: string, capacities: readonly number[]): PuzzleLine[] {
  const lines: PuzzleLine[] = [];
  const capacityAt = (lineIndex: number) => capacities[Math.min(lineIndex, capacities.length - 1)];
  const pushLine = (start: number, end: number) => lines.push({ start, text: template.slice(start, end) });

  let lineStart: number | null = null;
  let lineEnd = 0;
  let offset = 0;
  for (const word of template.split(' ')) {
    let wordStart = offset;
    const wordEnd = offset + word.length;
    offset = wordEnd + 1;
    if (!word) {
      continue;
    }
    if (lineStart !== null && wordEnd - lineStart <= capacityAt(lines.length)) {
      lineEnd = wordEnd;
      continue;
    }
    if (lineStart !== null) {
      pushLine(lineStart, lineEnd);
    }
    while (wordEnd - wordStart > capacityAt(lines.length)) {
      const cut = wordStart + capacityAt(lines.length);
      pushLine(wordStart, cut);
      wordStart = cut;
    }
    lineStart = wordStart;
    lineEnd = wordEnd;
  }
  if (lineStart !== null) {
    pushLine(lineStart, lineEnd);
  }
  return lines;
}

/** Each line's first column within its own row: one shared left edge for the whole block,
 *  centered on the board as a block. */
function lineStartColumns(lines: PuzzleLine[], widths: number[]): number[] {
  const bounds = lineStartBounds(lines, widths);
  const blockWidth = Math.max(...lines.map((line) => line.text.length));
  // Ceil: an odd leftover can't split evenly, and the spare blank goes on the left.
  const centered = Math.ceil((BOARD_COLUMNS - blockWidth) / 2);

  // Every shared edge in [earliest, latest] keeps all lines inside their own rows.
  const earliest = Math.max(...bounds.map((bound) => bound.earliest));
  const latest = Math.min(...bounds.map((bound) => bound.latest));
  const shared = earliest <= latest ? clamp(centered, earliest, latest) : centered;
  // When no single edge fits (only text with no alignable break gets here), each line moves just
  // far enough to fit its own row - as close to aligned as the board allows.
  return bounds.map((bound) => clamp(shared, bound.earliest, bound.latest) - bound.inset);
}

function hasSharedEdge(lines: PuzzleLine[], widths: number[]): boolean {
  const bounds = lineStartBounds(lines, widths);
  return Math.max(...bounds.map((bound) => bound.earliest)) <= Math.min(...bounds.map((bound) => bound.latest));
}

/** Per line, in board columns: the first and last column it can start at and still fit its row,
 *  plus that row's inset (to convert back to the row's own columns). */
function lineStartBounds(lines: PuzzleLine[], widths: number[]): { inset: number; earliest: number; latest: number }[] {
  return lines.map((line, i) => {
    const inset = (BOARD_COLUMNS - widths[i]) / 2;
    return { inset, earliest: inset, latest: inset + widths[i] - line.text.length };
  });
}

function rowCells(width: number, line: PuzzleLine | null, startColumn: number): PuzzleCell[] {
  return Array.from({ length: width }, (_, column) => {
    const offset = column - startColumn;
    if (!line || offset < 0 || offset >= line.text.length) {
      return { char: null, templateIndex: null };
    }
    return { char: line.text[offset], templateIndex: line.start + offset };
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
