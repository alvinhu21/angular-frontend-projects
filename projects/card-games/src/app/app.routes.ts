import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { AboutComponent } from './components/about/about.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';

export const routes: Routes = [

  {
    path: '',          // Route for HomeComponent
    component: HomeComponent
  },
  {
    path: 'about',         // Route for AboutComponent
    component: AboutComponent
  },
  {
    path: '**',            // Wildcard route for 404 page
    component: PageNotFoundComponent
  }
];