import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WedgeView } from '../../../models/wof.models';

interface ReelItem {
  wedge: WedgeView;
  offset: number;
}

const WINDOW_RADIUS = 3;
const SETTLE_MS = 1100;

/**
 * Shows the wedge the wheel just landed on plus its 3 neighbors on either side, like a slot-machine
 * reel, and plays a brief "spinning" animation whenever a new spin result arrives. The backend
 * resolves the spin instantly, so the "spin" here is a purely cosmetic client-side flourish timed
 * against the real landed wedge - there's no physical wheel angle to animate against.
 */
@Component({
  selector: 'app-wheel-reel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './wheel-reel.component.html',
  styleUrl: './wheel-reel.component.scss',
})
export class WheelReelComponent implements OnChanges {
  @Input({ required: true }) wheel: WedgeView[] = [];
  @Input() lastSpinIndex: number | null = null;

  readonly spinning = signal(false);
  private settleTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['lastSpinIndex'];
    if (change && !change.firstChange && this.lastSpinIndex !== null) {
      this.spinning.set(true);
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => this.spinning.set(false), SETTLE_MS);
    }
  }

  get windowItems(): ReelItem[] {
    if (this.lastSpinIndex === null || this.wheel.length === 0) {
      return [];
    }
    const n = this.wheel.length;
    const items: ReelItem[] = [];
    for (let offset = -WINDOW_RADIUS; offset <= WINDOW_RADIUS; offset++) {
      const idx = ((this.lastSpinIndex + offset) % n + n) % n;
      items.push({ wedge: this.wheel[idx], offset });
    }
    return items;
  }
}
