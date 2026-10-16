import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { profanityValidator } from 'shared-lib';
import { SeatRequest, SeatView } from '../../../models/session.models';
import { MAX_OTHER_SEATS, MIN_OTHER_SEATS, minimumSeatCount, withAi, withSeatCount } from './seat-edits';

/** Must match the server's GameSession.MAX_NAME_LENGTH. */
const MAX_NAME_LENGTH = 24;

/**
 * The lobby's lineup: the host, then each seat. For the host (while `editable`), each seat has a
 * name field and an AI checkbox, plus a picker for how many other players there are. Seats someone
 * has joined are theirs and stay locked. Every edit goes out as the complete new seat list.
 */
@Component({
  selector: 'app-seat-roster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './seat-roster.component.html',
  styleUrl: './seat-roster.component.scss',
})
export class SeatRosterComponent {
  readonly hostName = input.required<string>();
  readonly seats = input.required<readonly SeatView[]>();
  readonly editable = input(false);
  readonly seatsChange = output<SeatRequest[]>();

  readonly maxNameLength = MAX_NAME_LENGTH;
  readonly countOptions = Array.from({ length: MAX_OTHER_SEATS - MIN_OTHER_SEATS + 1 }, (_, i) => MIN_OTHER_SEATS + i);
  readonly minCount = computed(() => minimumSeatCount(this.seats()));
  /** Seat whose typed name was turned down here (not sent), so its field can say why. */
  readonly rejectedName = signal<number | null>(null);

  /** What's in each name field. A field keeps what the host is typing until the server changes that
   *  seat - so someone joining another seat mid-edit doesn't wipe it. */
  readonly drafts = linkedSignal<readonly SeatView[], string[]>({
    source: this.seats,
    computation: (seats, previous) =>
      seats.map((seat, i) => {
        const before = previous?.source[i];
        const unchanged = before?.name === seat.name && before?.playerId === seat.playerId;
        return unchanged && previous ? previous.value[i] : seat.name;
      }),
  });

  setCount(event: Event): void {
    this.emit(withSeatCount(this.current(), Number((event.target as HTMLSelectElement).value)));
  }

  setAi(index: number, event: Event): void {
    this.emit(withAi(this.current(), index, (event.target as HTMLInputElement).checked));
  }

  onDraft(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.drafts.update((drafts) => drafts.map((draft, i) => (i === index ? value : draft)));
    if (this.rejectedName() === index) {
      this.rejectedName.set(null);
    }
  }

  /** On blur or Enter: sends the renamed seat, unless the name is one to turn down. */
  commitName(index: number): void {
    const name = this.drafts()[index].trim();
    if (name === this.seats()[index].name) {
      return;
    }
    if (profanityValidator(new FormControl(name))) {
      this.rejectedName.set(index);
      return;
    }
    this.emit(this.current());
  }

  /** The seat list as it stands, with the names typed so far - so an edit made while a rename is
   *  still in flight doesn't send the old name back. A turned-down name is never sent. */
  private current(): SeatRequest[] {
    const drafts = this.drafts();
    return this.seats().map((seat, i) => ({
      name: seat.playerId === null && i !== this.rejectedName() ? drafts[i].trim() : seat.name,
      ai: seat.ai,
      playerId: seat.playerId,
    }));
  }

  private emit(seats: SeatRequest[]): void {
    this.seatsChange.emit(seats);
  }
}
