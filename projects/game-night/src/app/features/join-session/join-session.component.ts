import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TextInputComponent, profanityValidator } from 'shared-lib';
import { SessionApiService } from '../../core/session-api.service';
import { IdentityStorageService } from '../../core/identity-storage.service';

@Component({
  selector: 'app-join-session',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TextInputComponent, TranslateModule],
  templateUrl: './join-session.component.html',
  styleUrl: './join-session.component.scss',
})
export class JoinSessionComponent {
  private readonly router = inject(Router);
  private readonly sessionApi = inject(SessionApiService);
  private readonly identityStorage = inject(IdentityStorageService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly formGroup = new FormGroup({
    code: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    }),
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(24), profanityValidator],
    }),
  });

  readonly codeErrorMessages = {
    required: 'join.errorCodeRequired',
    minlength: 'join.errorCodeLength',
    maxlength: 'join.errorCodeLength',
  };

  readonly nameErrorMessages = {
    required: 'join.errorNameRequired',
    profanity: 'join.errorProfanity',
    maxlength: 'join.errorMaxLength',
  };

  joinSession(): void {
    if (this.formGroup.invalid || this.submitting()) {
      this.formGroup.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);
    const code = this.formGroup.controls.code.value.trim().toUpperCase();
    const displayName = this.formGroup.controls.displayName.value.trim();

    this.sessionApi.joinSession(code, displayName).subscribe({
      next: (response) => {
        this.identityStorage.save({
          code: response.code,
          playerId: response.playerId,
          gameType: response.gameType,
          displayName,
          isHost: false,
        });
        this.router.navigate(['/session', response.code, 'lobby']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'join.errorGeneric');
      },
    });
  }
}
