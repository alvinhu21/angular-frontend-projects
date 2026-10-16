import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AnnouncerService } from '../../services/announcer.service';

/**
 * Always-present ARIA live regions - render `<lib-live-region>` once in the app shell, then call
 * `AnnouncerService.announce(...)` from anywhere to have screen readers pick up the change.
 * Styling is self-contained so consuming apps don't need their own `.visually-hidden` utility.
 */
@Component({
  selector: 'lib-live-region',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{{ announcer.polite() }}</div>
    <div class="visually-hidden" role="alert" aria-live="assertive" aria-atomic="true">{{ announcer.assertive() }}</div>
  `,
  styles: [`
    .visually-hidden {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
  `],
})
export class LiveRegionComponent {
  protected readonly announcer = inject(AnnouncerService);
}
