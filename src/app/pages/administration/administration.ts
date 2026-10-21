import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container py-3">
      <h1 class="h3 mb-3">Administracao</h1>
      <nav class="nav nav-tabs mb-4" aria-label="Administracao">
        <a class="nav-link" routerLink="/admin/features" routerLinkActive="active">Features</a>
        <a class="nav-link" routerLink="/admin/developers" routerLinkActive="active">Desenvolvedores</a>
      </nav>
      <router-outlet />
    </div>
  `
})
export class Administration {}