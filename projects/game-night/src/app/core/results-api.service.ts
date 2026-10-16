import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse, PlayerResultView } from '../models/results.models';
import { RuntimeConfigService } from './runtime-config.service';

/** Results of finished games, as recorded by the server when each game ends. */
@Injectable({ providedIn: 'root' })
export class ResultsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfigService);

  /** Every person's finish, newest game first and each game's players best-first. */
  getJeopardyResults(page: number, size: number): Observable<PageResponse<PlayerResultView>> {
    return this.http.get<PageResponse<PlayerResultView>>(`${this.runtimeConfig.apiBaseUrl}/jeopardy/results`, {
      params: { page, size },
    });
  }
}
