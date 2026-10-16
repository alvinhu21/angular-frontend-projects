import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const KEY = 'game-night.locale';

export const SUPPORTED_LOCALES = ['en', 'de', 'es', 'fr', 'it', 'ja', 'zh'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ja: '日本語',
  zh: '中文',
};

/**
 * Thin wrapper around TranslateService: remembers the player's chosen language across visits
 * (localStorage - per-browser, not tied to any one game session) and keeps the document's `lang`
 * attribute in sync for accessibility/font-selection purposes.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);

  /** Call once, at app startup. */
  init(): void {
    const locale = this.load() ?? 'en';
    this.translate.use(locale);
    this.applyDocumentLang(locale);
  }

  current(): Locale {
    return (this.translate.currentLang as Locale) || 'en';
  }

  setLocale(locale: Locale): void {
    this.translate.use(locale);
    this.save(locale);
    this.applyDocumentLang(locale);
  }

  private applyDocumentLang(locale: Locale): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }

  private save(locale: Locale): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(KEY, locale);
  }

  private load(): Locale | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(KEY);
    return raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : null;
  }
}
