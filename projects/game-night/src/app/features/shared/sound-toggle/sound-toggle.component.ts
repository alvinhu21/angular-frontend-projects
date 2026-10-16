import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { GameSoundControl } from '../audio/game-synth';

/** Mute switch for whichever game audio service the screen provides as GameSoundControl. */
@Component({
  selector: 'app-sound-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './sound-toggle.component.html',
  styleUrl: './sound-toggle.component.scss',
})
export class SoundToggleComponent {
  readonly audio = inject(GameSoundControl);
}
