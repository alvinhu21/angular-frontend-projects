import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ModalComponent } from 'shared-lib';
import { ModalFocusDirective } from './modal-focus.directive';

@Component({
  imports: [ModalComponent, ModalFocusDirective],
  template: `
    <button id="opener" type="button" (click)="modal.openModal()">Open</button>
    <lib-modal
      #modal
      appModalFocus
      modalAriaLabel="Test dialog"
      [showButtons]="false"
      [modalBodyContent]="body"
      [modalFooterContent]="footer"
    ></lib-modal>
    <ng-template #body>
      <button id="first" type="button">First</button>
      <button id="second" type="button">Second</button>
    </ng-template>
    <ng-template #footer><button id="ok" type="button" data-autofocus>OK</button></ng-template>
  `,
})
class HostComponent {}

describe('ModalFocusDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const query = <T extends Element>(selector: string) => fixture.nativeElement.querySelector(selector) as T | null;
  const keydown = (target: Element, key: string, shiftKey = false) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));

  async function open(): Promise<void> {
    const opener = query<HTMLButtonElement>('#opener')!;
    opener.focus();
    opener.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideTranslateService()] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('moves focus into the dialog, to its [data-autofocus] control', async () => {
    await open();

    expect(query('[role="dialog"]')).not.toBeNull();
    expect(document.activeElement?.id).toBe('ok');
  });

  it('closes on Escape and hands focus back to whatever opened it', async () => {
    await open();

    keydown(query('#ok')!, 'Escape');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(query('[role="dialog"]')).toBeNull();
    expect(document.activeElement?.id).toBe('opener');
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    await open();
    const closeButton = query<HTMLButtonElement>('[role="dialog"] .close')!;

    keydown(query('#ok')!, 'Tab');
    expect(document.activeElement).toBe(closeButton);

    keydown(closeButton, 'Tab', true);
    expect(document.activeElement?.id).toBe('ok');
  });
});
