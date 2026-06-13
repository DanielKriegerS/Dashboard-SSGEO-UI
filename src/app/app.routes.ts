import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('../app/core/main/main/main').then(m => m.Main) },
  { path: 'quarters', loadComponent: () => import('../app/pages/quarters/quarters').then(m => m.QuartersComponent) },
  { path: 'quarters/:id', loadComponent: () => import('../app/pages/quarter/quarter').then(m => m.QuarterComponent) },
  { path: 'sprints', loadComponent: () => import('../app/pages/sprints/sprints').then(m => m.SprintsComponent) },
  { path: 'sprints/:id', loadComponent: () => import('../app/pages/sprint/sprint').then(m => m.SprintComponent) },
  { path: 'coatends', loadComponent: () => import('../app/pages/coatends/coatends').then(m => m.CoatendsComponent) },
  { path: 'coatends/:id', loadComponent: () => import('../app/pages/coatend/coatend').then(m => m.CoatendComponent) },
  { path: '**', redirectTo: '' }
];