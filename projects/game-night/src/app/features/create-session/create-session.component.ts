import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TextInputComponent, profanityValidator } from 'shared-lib';
import { GameType } from '../../models/session.models';
import { SessionApiService } from '../../core/session-api.service';
import { IdentityStorageService } from '../../core/identity-storage.service';

@Component({
  selector: 'app-create-session',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TextInputComponent, TranslateModule],
  templateUrl: './create-session.component.html',
  styleUrl: './create-session.component.scss',
})
export class CreateSessionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionApi = inject(SessionApiService);
  private readonly identityStorage = inject(IdentityStorageService);

  readonly gameType: GameType = this.route.snapshot.paramMap.get('gameType') === 'JEOPARDY' ? 'JEOPARDY' : 'WOF';
  readonly gameTitleKey = this.gameType === 'JEOPARDY' ? 'create.hostHeadingJeopardy' : 'create.hostHeadingWof';
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly formGroup = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(24), profanityValidator],
    }),
  });

  // Values are translation keys - shared-lib's lib-text-input pipes error messages through
  // `translate` itself, so this maps validator name -> key rather than literal English text.
  readonly errorMessages = {
    required: 'create.errorRequired',
    profanity: 'create.errorProfanity',
    maxlength: 'create.errorMaxLength',
  };

  createSession(): void {
    if (this.formGroup.invalid || this.submitting()) {
      this.formGroup.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const displayName = this.formGroup.controls.displayName.value.trim();

    this.sessionApi.createSession(this.gameType, displayName).subscribe({
      next: (response) => {
        this.identityStorage.save({
          code: response.code,
          playerId: response.hostPlayerId,
          gameType: response.gameType,
          displayName,
          isHost: true,
        });
        this.router.navigate(['/session', response.code, 'lobby']);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('create.errorGeneric');
      },
    });
  }
}
