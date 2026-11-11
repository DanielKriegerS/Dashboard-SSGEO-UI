import { Routes } from '@angular/router';
import { accessGuard, adminGuard } from './core/auth/access.guard';

export const routes: Routes = [
  { path: 'access', loadComponent: () => import('./pages/access/access').then(m => m.AccessPage) },
  { path: '', canActivateChild: [accessGuard], children: [
  { path: '', pathMatch: 'full', title: 'Home - SSGEO', loadComponent: () => import('./pages/menu/menu').then(m => m.MenuPage) },
  { path: 'planning', title: 'Planejamento - SSGEO', data: { menu: 'planning' }, loadComponent: () => import('./pages/menu/menu').then(m => m.MenuPage) },
  { path: 'planner', loadComponent: () => import('./core/main/main/main').then(m => m.Main) },
  { path: 'quarters', loadComponent: () => import('../app/pages/quarters/quarters').then(m => m.QuartersComponent) },
  { path: 'quarters/:id', loadComponent: () => import('../app/pages/quarter/quarter').then(m => m.QuarterComponent) },
  { path: 'sprints', loadComponent: () => import('../app/pages/sprints/sprints').then(m => m.SprintsComponent) },
  { path: 'sprints/:id', loadComponent: () => import('../app/pages/sprint/sprint').then(m => m.SprintComponent) },
  { path: 'coatends', loadComponent: () => import('../app/pages/coatends/coatends').then(m => m.CoatendsComponent) },
  { path: 'incidents', loadComponent: () => import('./pages/incidents/incidents').then(m => m.Incidents) },
  { path: 'incidents/new', loadComponent: () => import('./pages/incident/incident').then(m => m.Incident) },
  { path: 'incidents/:id', loadComponent: () => import('./pages/incident/incident').then(m => m.Incident) },
  { path: 'coatends/:id', loadComponent: () => import('../app/pages/coatend/coatend').then(m => m.CoatendComponent) },
  { path: 'developers', redirectTo: 'admin/developers', pathMatch: 'full' },
  {
    path: 'admin', loadComponent: () => import('./pages/administration/administration').then(m => m.Administration),
    children: [
      { path: 'members', canActivate: [adminGuard], loadComponent: () => import('./pages/administration/members/members').then(m => m.MembersPage) },
      { path: '', pathMatch: 'full', title: 'Administração - SSGEO', data: { menu: 'admin' }, loadComponent: () => import('./pages/menu/menu').then(m => m.MenuPage) },
      { path: 'developers', loadComponent: () => import('./pages/developers/developers').then(m => m.Developers) },
      { path: 'features', loadComponent: () => import('./pages/features/features').then(m => m.Features) },
      { path: 'features/new', loadComponent: () => import('./pages/feature/feature').then(m => m.Feature) },
      { path: 'features/:id', loadComponent: () => import('./pages/feature/feature').then(m => m.Feature) }
    ]
  },
  { path: 'coatends/:id/timeline', loadComponent: () => import('../app/pages/coatend-timeline/coatend-timeline').then(m => m.CoatendTimelineComponent) },
  { path: '**', redirectTo: '' }
  ] }
];