import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { PuzzleBoardComponent } from './puzzle-board.component';

describe('PuzzleBoardComponent', () => {
  let fixture: ComponentFixture<PuzzleBoardComponent>;

  function render(category: string | null): void {
    fixture.componentRef.setInput('template', 'HAWAII BEACH');
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();
  }

  function strip(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.category');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PuzzleBoardComponent],
      providers: [provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { 'wof.categoryLabel': 'Category:' });
    translate.use('en');
    fixture = TestBed.createComponent(PuzzleBoardComponent);
  });

  it('captions the board with its category, announced as a category to screen readers', () => {
    render('Food & Drink');

    expect(strip()?.textContent?.trim()).toBe('Category: Food & Drink');
    expect(strip()?.querySelector('.visually-hidden')?.textContent).toBe('Category:');
    // The strip sits under the letter grid, inside the board.
    const layout = fixture.nativeElement.querySelector('.puzzle-layout');
    expect(layout.lastElementChild).toBe(strip());
  });

  it('reports whether every letter box is filled, including after one is cleared again', () => {
    fixture.componentRef.setInput('template', 'C_T _O_');
    fixture.componentRef.setInput('solving', true);
    fixture.detectChanges();
    const boxes: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('.cell__input'));
    const type = (box: HTMLInputElement, value: string) => {
      box.value = value;
      box.dispatchEvent(new Event('input'));
    };
    expect(boxes.length).toBe(3);

    type(boxes[0], 'a');
    type(boxes[1], 'd');
    expect(fixture.componentInstance.allLettersFilled()).toBeFalse();

    type(boxes[2], 'g');
    expect(fixture.componentInstance.allLettersFilled()).toBeTrue();
    expect(fixture.componentInstance.currentGuess()).toBe('CAT DOG');

    type(boxes[1], '');
    expect(fixture.componentInstance.allLettersFilled()).toBeFalse();
  });

  it('flashes its frame green for a solve and red for a miss, and lights its alert lines on cue', () => {
    render('Food & Drink');
    const frame = (): HTMLElement => fixture.nativeElement.querySelector('.puzzle-frame');
    expect(frame().className).toBe('puzzle-frame');

    fixture.componentRef.setInput('flash', 'correct');
    fixture.detectChanges();
    expect(frame().classList).toContain('puzzle-frame--correct');

    fixture.componentRef.setInput('flash', 'wrong');
    fixture.componentRef.setInput('alert', true);
    fixture.detectChanges();
    expect(frame().classList).toContain('puzzle-frame--wrong');
    expect(frame().classList).not.toContain('puzzle-frame--correct');
    expect(frame().classList).toContain('puzzle-frame--alert');
  });

  it('shows no strip at all until there is a category', () => {
    render(null);
    expect(strip()).toBeNull();

    render('');
    expect(strip()).toBeNull();
  });
});
