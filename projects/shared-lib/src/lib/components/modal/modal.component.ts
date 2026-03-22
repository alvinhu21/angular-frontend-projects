import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { ReactiveFormsModule  } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';



@Component({
  selector: 'lib-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent  {

  /**
   * Data passed to templates
   */
  @Input() modalId: string = "modal_id";
  @Input() headerData: any;
  @Input() footerData: any;
  @Input() bodyData: any;
  @Input() faClass: string = ""
  @Input() faPrefix: "fa" | "far" | "fas" | "fab" | "fal" = "fa";
  @Input() showButtons: boolean = true;

  @Input() widthPct: number = 80;

  @Input() modalHeaderClass: string = "";
  @Input() modalBodyClass: string = "text-align-left";
  @Input() modalFooterClass: string = "";

  @Input() btnOpenModalClass: string = "btn-primary";

  @Input() openModalText: string = "common.openModal";

  /**
   * Custom templates supplied by parent components
   */
  @Input()
  modalHeaderContent!: TemplateRef<any>;

  @Input()
  modalBodyContent!: TemplateRef<any>;

  @Input()
  modalFooterContent!: TemplateRef<any>;

  /**
   * Modal visibility state
   */
  isOpen$ = new BehaviorSubject<boolean>(false);

  /**
   * Opens the modal
   */
  openModal(): void {
    this.isOpen$.next(true);
  }

  /**
   * Closes the modal
   */
  closeModal(): void {
    this.isOpen$.next(false);
  }

  get widthPercent(){
    return `width-${this.widthPct}-pct`;
  }
}
