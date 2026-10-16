import { PUZZLE_ROW_WIDTHS, layoutPuzzle } from './puzzle-layout';

/** Draws the laid-out board in board columns: a 12-wide row is indented one space (the way it
 *  renders, inset under the 14-wide rows), padding cells are '.', and puzzle characters - word
 *  gaps included - are shown as-is. */
function draw(template: string): string[] {
  return layoutPuzzle(template).map((row) => {
    const inset = ' '.repeat((14 - row.length) / 2);
    return inset + row.map((cell) => cell.char ?? '.').join('');
  });
}

describe('layoutPuzzle', () => {
  it('lays out nothing for an empty template', () => {
    expect(layoutPuzzle('')).toEqual([]);
  });

  it('always fills the whole 12/14/14/12 board, using the middle rows for a one-liner', () => {
    expect(layoutPuzzle('DOGS').map((row) => row.length)).toEqual([...PUZZLE_ROW_WIDTHS]);
    expect(draw('DOGS')).toEqual([
      ' ............',
      '.....DOGS.....',
      '..............',
      ' ............',
    ]);
  });

  it('bumps an odd-width puzzle one space right, since the rows cannot center it exactly', () => {
    expect(draw('CAT')).toEqual([
      ' ............',
      '......CAT.....',
      '..............',
      ' ............',
    ]);
  });

  it('left-justifies the lines against one shared edge and centers the block by its widest line', () => {
    expect(draw('BETTER LATE THAN NEVER')).toEqual([
      ' ............',
      '..BETTER LATE.',
      '..THAN NEVER..',
      ' ............',
    ]);
    // Odd-width block (13): bumped right, not centered line by line.
    expect(draw('A BLESSING IN DISGUISE')).toEqual([
      ' ............',
      '.A BLESSING IN',
      '.DISGUISE.....',
      ' ............',
    ]);
  });

  it('lines the narrower top and bottom rows up on the same board column', () => {
    expect(draw('A PICTURE IS WORTH A THOUSAND WORDS')).toEqual([
      ' A PICTURE IS',
      '.WORTH A......',
      '.THOUSAND.....',
      ' WORDS.......',
    ]);
  });

  it('breaks lines so they can share an edge, instead of filling a full-width row edge to edge', () => {
    // Greedy wrapping gives "MISSING THE / FOREST FOR THE / TREES", whose 14-letter middle line
    // can't line up with a line on the 12-wide top row.
    expect(draw('MISSING THE FOREST FOR THE TREES')).toEqual([
      ' .MISSING THE',
      '..FOREST FOR..',
      '..THE TREES...',
      ' ............',
    ]);
  });

  it('keeps every line inside its own row when no break lets the lines share an edge', () => {
    expect(draw('ABCDEFGHIJKLMN ABCDEFGHIJKLMN AB')).toEqual([
      ' ABCDEFGHIJKL',
      'MN............',
      'ABCDEFGHIJKLMN',
      ' AB..........',
    ]);
  });

  it('adds full-width rows rather than dropping letters when the text cannot fit the board', () => {
    expect(draw('ABCDEFGHIJKLMN ABCDEFGHIJKLMN ABCDEFGHIJKLMN')).toEqual([
      ' ABCDEFGHIJKL',
      'MN............',
      'ABCDEFGHIJKLMN',
      ' ABCDEFGHIJKL',
      'MN............',
    ]);
  });

  it('puts every template character in exactly one cell that points back at it', () => {
    const templates = [
      'CAT',
      "IT'S A DOG'S LIFE",
      'B_TT_R L_T_ TH_N N_V_R',
      'ALL GOOD THINGS MUST COME TO AN END',
      'WHERE THERE IS SMOKE THERE IS FIRE',
      'SUPERCALIFRAGILISTIC',
      'ABCDEFGHIJKLMN ABCDEFGHIJKLMN ABCDEFGHIJKLMN',
    ];
    for (const template of templates) {
      const cells = layoutPuzzle(template).flat();
      const placed = cells.filter((cell) => cell.templateIndex !== null);
      for (const cell of placed) {
        expect(template[cell.templateIndex!]).withContext(template).toBe(cell.char!);
      }
      const placedIndices = placed.map((cell) => cell.templateIndex);
      const letterIndices = [...template].flatMap((char, i) => (char === ' ' ? [] : [i]));
      expect(new Set(placedIndices).size).withContext(template).toBe(placedIndices.length);
      expect(letterIndices.every((i) => placedIndices.includes(i))).withContext(template).toBeTrue();
    }
  });
});
