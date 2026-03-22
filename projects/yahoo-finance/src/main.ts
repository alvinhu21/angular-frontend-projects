import 'zone.js'; // <-- must be first
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { provideTranslate } from './app/providers/translate.provider';

import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(), // provides HttpClient globally
    provideRouter(routes, withEnabledBlockingInitialNavigation()), // router,
    provideTranslate
  ]
}).catch(err => console.error(err));
