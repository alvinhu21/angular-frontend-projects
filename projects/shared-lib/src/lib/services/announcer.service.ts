import { Injectable, signal } from '@angular/core';

export type Politeness = 'polite' | 'assertive';

/**
 * Feeds the app-wide ARIA live regions rendered by `LiveRegionComponent`.
 *
 * The regions exist in the DOM from the first render, which screen readers require before
 * they will announce changes (WCAG 4.1.3 Status Messages).
 */
@Injectable({ providedIn: 'root' })
export class AnnouncerService {
  private readonly politeMessage = signal('');
  private readonly assertiveMessage = signal('');
  private clearTimer: ReturnType<typeof setTimeout> | undefined;

  readonly polite = this.politeMessage.asReadonly();
  readonly assertive = this.assertiveMessage.asReadonly();

  announce(message: string, politeness: Politeness = 'polite'): void {
    const target = politeness === 'assertive' ? this.assertiveMessage : this.politeMessage;

    // Clearing first lets the same message be announced twice in a row.
    target.set('');
    clearTimeout(this.clearTimer);
    this.clearTimer = setTimeout(() => {
      target.set(message);
      this.clearTimer = setTimeout(() => target.set(''), 7000);
    }, 100);
  }
}
