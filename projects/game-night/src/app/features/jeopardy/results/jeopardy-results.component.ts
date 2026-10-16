import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, map, of, switchMap, tap } from 'rxjs';
import { ResultsApiService } from '../../../core/results-api.service';
import { PageResponse, PlayerResultView } from '../../../models/results.models';
import { MoneyPipe } from '../money.pipe';

export const RESULTS_PAGE_SIZE = 25;

type LoadStatus = 'loading' | 'ready' | 'error';

type PageOutcome = { ok: true; page: PageResponse<PlayerResultView> } | { ok: false };

/** Every recorded Jeopardy finish - who played, their score, which game, and where they placed. */
@Component({
  selector: 'app-jeopardy-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MoneyPipe, RouterLink, TranslateModule],
  templateUrl: './jeopardy-results.component.html',
  styleUrl: './jeopardy-results.component.scss',
})
export class JeopardyResultsComponent {
  private readonly api = inject(ResultsApiService);
  private readonly pageRequests = new Subject<number>();

  readonly status = signal<LoadStatus>('loading');
  /** The last page that loaded - kept on screen while the next one loads, so nothing jumps. */
  readonly results = signal<PageResponse<PlayerResultView> | null>(null);
  private readonly requestedPage = signal(0);

  readonly rows = computed(() => this.results()?.items ?? []);
  readonly page = computed(() => this.results()?.page ?? 0);
  readonly totalPages = computed(() => this.results()?.totalPages ?? 0);
  readonly hasPrevious = computed(() => this.page() > 0);
  readonly hasNext = computed(() => this.page() + 1 < this.totalPages());

  constructor() {
    // switchMap drops a slower, older page if someone pages again before it arrives.
    this.pageRequests
      .pipe(
        tap((page) => {
          this.requestedPage.set(page);
          this.status.set('loading');
        }),
        switchMap((page) =>
          this.api.getJeopardyResults(page, RESULTS_PAGE_SIZE).pipe(
            map((response): PageOutcome => ({ ok: true, page: response })),
            catchError(() => of<PageOutcome>({ ok: false })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.applyOutcome(outcome));
    this.pageRequests.next(0);
  }

  goTo(page: number): void {
    if (page < 0 || this.status() === 'loading') {
      return;
    }
    this.pageRequests.next(page);
  }

  retry(): void {
    this.pageRequests.next(this.requestedPage());
  }

  /** Rows arrive grouped by game; the first row of each group gets a divider. */
  startsGame(index: number): boolean {
    const rows = this.rows();
    return index === 0 || rows[index - 1].gameId !== rows[index].gameId;
  }

  private applyOutcome(outcome: PageOutcome): void {
    if (!outcome.ok) {
      this.status.set('error');
      return;
    }
    const { page } = outcome;
    // Results can shrink underneath an open page (e.g. the database was cleared) - land on the last real page.
    if (page.items.length === 0 && page.totalPages > 0 && page.page >= page.totalPages) {
      this.pageRequests.next(page.totalPages - 1);
      return;
    }
    this.results.set(page);
    this.status.set('ready');
  }
}
