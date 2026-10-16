import { DOCUMENT, DestroyRef, Directive, ElementRef, Injector, afterNextRender, inject } from '@angular/core';
import { distinctUntilChanged } from 'rxjs';
import { ModalComponent } from 'shared-lib';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The keyboard handling shared-lib's <lib-modal> leaves to its host: when the dialog opens, focus
 * moves into it (to a `[data-autofocus]` control, else the first control in its body, else its
 * footer); Tab and Shift+Tab stay inside it; Escape closes it; and when it closes, focus goes back
 * to whatever had it before.
 */
@Directive({
  selector: 'lib-modal[appModalFocus]',
  host: { '(keydown)': 'onKeydown($event)' },
})
export class ModalFocusDirective {
  private readonly modal = inject(ModalComponent);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private returnFocusTo: HTMLElement | null = null;

  constructor() {
    const subscription = this.modal.isOpen$
      .pipe(distinctUntilChanged())
      .subscribe((open) => (open ? this.onOpen() : this.onClose()));
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  onKeydown(event: KeyboardEvent): void {
    const dialog = this.dialog();
    if (!dialog) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.modal.closeModal();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  private onOpen(): void {
    const active = this.document.activeElement;
    this.returnFocusTo = active instanceof HTMLElement ? active : null;
    // The dialog only exists once the modal has rendered its open state.
    afterNextRender(() => this.focusInitialControl(), { injector: this.injector });
  }

  private onClose(): void {
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    if (target?.isConnected) {
      target.focus();
    }
  }

  private focusInitialControl(): void {
    const dialog = this.dialog();
    if (!dialog) {
      return;
    }
    const target =
      dialog.querySelector<HTMLElement>('[data-autofocus]:not([disabled])') ??
      dialog.querySelector<HTMLElement>(`.modal-body :is(${FOCUSABLE})`) ??
      dialog.querySelector<HTMLElement>(`.modal-footer :is(${FOCUSABLE})`) ??
      dialog;
    target.focus();
  }

  private dialog(): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>('[role="dialog"]');
  }
}
