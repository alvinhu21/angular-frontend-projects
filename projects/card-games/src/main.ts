// 2026-03-03T20:15 main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { HttpClient } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { importProvidersFrom } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { routes } from './app/app.routes';

// Factory function for TranslateHttpLoader
export function HttpLoaderFactory() {
  return new TranslateHttpLoader();
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter(routes, withEnabledBlockingInitialNavigation()), // router,
    // Provide the loader config token
    { provide: TRANSLATE_HTTP_LOADER_CONFIG, useValue: { prefix: '/assets/i18n/', suffix: '.json' } },

    // Import TranslateModule for standalone bootstrap
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient, TRANSLATE_HTTP_LOADER_CONFIG]
        }
      })
    )
  ]
}).catch(err => console.error(err));