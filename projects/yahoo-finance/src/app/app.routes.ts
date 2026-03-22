import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { StockDetailComponent } from './components/stock-detail/stock-detail.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent},
  { path: 'stockDetails/:stock', component: StockDetailComponent },
];
