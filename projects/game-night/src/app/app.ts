import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LiveRegionComponent } from 'shared-lib';
import { LocaleService } from './core/locale.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LiveRegionComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(LocaleService).init();
  }
}
