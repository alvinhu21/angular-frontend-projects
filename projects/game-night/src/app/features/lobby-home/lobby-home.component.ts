import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LOCALE_LABELS, Locale, LocaleService, SUPPORTED_LOCALES } from '../../core/locale.service';

@Component({
  selector: 'app-lobby-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  templateUrl: './lobby-home.component.html',
  styleUrl: './lobby-home.component.scss',
})
export class LobbyHomeComponent {
  private readonly locale = inject(LocaleService);
  readonly locales = SUPPORTED_LOCALES;
  readonly localeLabels = LOCALE_LABELS;

  currentLocale(): Locale {
    return this.locale.current();
  }

  changeLocale(value: string): void {
    this.locale.setLocale(value as Locale);
  }
}
