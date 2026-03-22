import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { httpLoaderFactory } from './custom-translate-loader';

export const provideTranslate = importProvidersFrom(
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useFactory: httpLoaderFactory,
      deps: [HttpClient] // inject HttpClient
    },
    defaultLanguage: 'en'
  })
);
