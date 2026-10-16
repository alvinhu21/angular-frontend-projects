import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ResultsApiService } from '../../../core/results-api.service';
import { PageResponse, PlayerResultView } from '../../../models/results.models';
import { JeopardyResultsComponent, RESULTS_PAGE_SIZE } from './jeopardy-results.component';

function result(overrides: Partial<PlayerResultView> = {}): PlayerResultView {
  return {
    resultId: 1,
    displayName: 'Alice',
    finalScore: 1200,
    place: 1,
    tied: false,
    gameId: 7,
    sessionCode: 'ABC123',
    completedAt: '2026-10-04T20:15:30Z',
    roundCount: 2,
    contestantCount: 3,
    ...overrides,
  };
}

function page(items: PlayerResultView[], pageIndex = 0, totalPages = 1, totalItems = items.length): PageResponse<PlayerResultView> {
  return { items, page: pageIndex, size: RESULTS_PAGE_SIZE, totalItems, totalPages };
}

describe('JeopardyResultsComponent', () => {
  let fixture: ComponentFixture<JeopardyResultsComponent>;
  let getJeopardyResults: jasmine.Spy<(page: number, size: number) => Observable<PageResponse<PlayerResultView>>>;

  const text = (): string => fixture.nativeElement.textContent;
  const query = <T extends Element>(selector: string): T | null => fixture.nativeElement.querySelector(selector);
  const rows = (): HTMLTableRowElement[] => Array.from(fixture.nativeElement.querySelectorAll('tbody tr'));
  const button = (label: string): HTMLButtonElement =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find((b) =>
      b.textContent?.includes(label),
    )!;

  function create(): void {
    TestBed.configureTestingModule({
      imports: [JeopardyResultsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ResultsApiService, useValue: { getJeopardyResults } },
      ],
    });
    fixture = TestBed.createComponent(JeopardyResultsComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    getJeopardyResults = jasmine.createSpy('getJeopardyResults');
  });

  it('lists each finish with its player, place, score and game', () => {
    getJeopardyResults.and.returnValue(
      of(page([result(), result({ resultId: 2, displayName: 'Bob', finalScore: -400, place: 3 })])),
    );
    create();

    expect(getJeopardyResults).toHaveBeenCalledOnceWith(0, RESULTS_PAGE_SIZE);
    expect(rows().length).toBe(2);
    const [alice, bob] = rows();
    expect(alice.querySelector('.standings__name')?.textContent).toBe('Alice');
    expect(alice.querySelector('.standings__score')?.textContent?.trim()).toBe('$1,200');
    expect(alice.querySelector('.standings__medal--first')).not.toBeNull();
    expect(alice.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-04T20:15:30Z');
    expect(bob.querySelector('.standings__score--negative')?.textContent?.trim()).toBe('−$400');
    expect(bob.querySelector('.standings__medal--first')).toBeNull();
  });

  it('marks where each new game starts', () => {
    getJeopardyResults.and.returnValue(
      of(page([result(), result({ resultId: 2, place: 2 }), result({ resultId: 3, gameId: 6 })])),
    );
    create();

    expect(rows().map((r) => r.classList.contains('standings__row--game-start'))).toEqual([true, false, true]);
  });

  it('says when nothing has been recorded yet', () => {
    getJeopardyResults.and.returnValue(of(page([], 0, 0)));
    create();

    expect(query('table')).toBeNull();
    expect(text()).toContain('results.empty');
  });

  it('offers a retry when the results cannot be loaded', () => {
    getJeopardyResults.and.returnValue(throwError(() => new Error('offline')));
    create();

    expect(text()).toContain('results.error');

    getJeopardyResults.and.returnValue(of(page([result()])));
    button('results.retry').click();
    fixture.detectChanges();

    expect(getJeopardyResults).toHaveBeenCalledTimes(2);
    expect(rows().length).toBe(1);
  });

  it('pages forward and back, keeping the current page up while the next one loads', () => {
    const next = new Subject<PageResponse<PlayerResultView>>();
    getJeopardyResults.and.returnValues(of(page([result()], 0, 2, 26)), next, of(page([result()], 0, 2, 26)));
    create();
    expect(button('results.previous').disabled).toBeTrue();

    button('results.next').click();
    fixture.detectChanges();

    expect(getJeopardyResults).toHaveBeenCalledWith(1, RESULTS_PAGE_SIZE);
    expect(rows().length).withContext('old page stays visible').toBe(1);
    expect(query('.results__board')?.getAttribute('aria-busy')).toBe('true');
    expect(button('results.next').disabled).withContext('no double-paging mid-load').toBeTrue();

    next.next(page([result({ resultId: 9, displayName: 'Zed' })], 1, 2, 26));
    fixture.detectChanges();

    expect(rows()[0].querySelector('.standings__name')?.textContent).toBe('Zed');
    expect(button('results.next').disabled).toBeTrue();
    expect(button('results.previous').disabled).toBeFalse();

    button('results.previous').click();
    fixture.detectChanges();
    expect(getJeopardyResults).toHaveBeenCalledTimes(3);
    expect(getJeopardyResults.calls.mostRecent().args).toEqual([0, RESULTS_PAGE_SIZE]);
  });

  it('falls back to the last real page if results shrank under the one asked for', () => {
    getJeopardyResults.and.returnValues(of(page([], 3, 2, 30)), of(page([result()], 1, 2, 30)));
    create();

    expect(getJeopardyResults.calls.allArgs()).toEqual([
      [0, RESULTS_PAGE_SIZE],
      [1, RESULTS_PAGE_SIZE],
    ]);
    expect(rows().length).toBe(1);
  });
});
