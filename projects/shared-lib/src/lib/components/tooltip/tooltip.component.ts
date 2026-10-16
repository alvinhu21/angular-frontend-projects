import { CommonModule } from '@angular/common';
import { Component, Input  } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'lib-tooltip',
  imports: [CommonModule, TranslateModule],
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss',
})
export class TooltipComponent {

  @Input() tooltipLabel: string = "";
  @Input() tooltipText: string = "";
  @Input() faIcon: string = "";
  @Input() tooltipDirection : 'left'|'right'|'top'|'bottom' = 'top';

    
}
