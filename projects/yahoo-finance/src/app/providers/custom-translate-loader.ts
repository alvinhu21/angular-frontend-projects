import { TranslateLoader } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export class CustomTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient, private path: string = './assets/i18n/') {}

  getTranslation(lang: string): Observable<any> {
    return this.http.get(`${this.path}${lang}.json`);
  }
}

// Factory for providers
export function httpLoaderFactory(http: HttpClient): TranslateLoader {
  return new CustomTranslateLoader(http);
}
