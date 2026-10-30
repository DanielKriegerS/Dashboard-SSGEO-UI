import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { navigationMenus } from '../../shared/navigation';

@Component({
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="menu-page" [attr.aria-labelledby]="'menu-heading'">
      <header class="menu-heading">
        @if (isHome) {
          <div class="brand-wordmark" aria-label="SSGEO">SSGEO</div>
          <h1 id="menu-heading">Squad Sustentação GEO</h1>
        } @else {
          <h1 id="menu-heading">{{ menu?.label }}</h1>
        }
      </header>
      <nav class="menu-cards" [attr.aria-label]="isHome ? 'Menus disponíveis' : menu?.label">
        @for (item of items; track item.path) {
          <a class="menu-card" [routerLink]="item.path">
            <span class="card-icon" [class.planning-icon]="item.icon === 'file-spreadsheet'" aria-hidden="true"></span>
            <span>{{ item.label }}</span>
            <span class="card-arrow" aria-hidden="true"></span>
          </a>
        }
      </nav>
    </section>
  `,
  styles: `
    :host { display: block; }
    .menu-page { --menu-accent: #18664c; max-width: 1100px; margin: 0 auto; padding: 1rem 0; container-type: inline-size; }
    .menu-heading { padding: 1rem 0 2rem; border-bottom: 1px solid #ccd4da; margin-bottom: 1.5rem; }
    .brand-wordmark { color: var(--menu-accent); font-size: 3rem; font-weight: 750; line-height: 1.1; margin-bottom: 1rem; }
    h1 { font-size: 1.75rem; font-weight: 600; margin: 0; overflow-wrap: anywhere; }
    .menu-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 1rem; }
    .menu-card { min-height: 112px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;
      color: #182630; background: #fff; border: 1px solid #c9d2d8; border-top: 3px solid var(--menu-accent);
      border-radius: 6px; text-decoration: none; font-size: 1.125rem; font-weight: 600; min-width: 0; }
    .menu-card:nth-child(even) { --menu-accent: #9b3c4c; }
    .menu-card:hover { background: #f0f5f2; border-color: var(--menu-accent); }
    .menu-card:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
    .menu-card > span:nth-child(2) { overflow-wrap: anywhere; }
    .card-icon, .card-arrow { width: 24px; height: 24px; flex: 0 0 24px; background: currentColor;
      mask: url('/icons/file-text.svg') center / contain no-repeat; color: var(--menu-accent); }
    .planning-icon { mask-image: url('/icons/file-spreadsheet.svg'); }
    .card-arrow { margin-left: auto; width: 18px; height: 18px; flex-basis: 18px; mask-image: url('/icons/chevron-right.svg'); }
    @media (max-width: 575px) { h1 { font-size: 1.375rem; } .brand-wordmark { font-size: 2.5rem; } .menu-card { padding: 1rem; } }
    @container (max-width: 240px) {
      .menu-card { padding: .75rem; gap: .5rem; font-size: 1rem; }
      .card-icon, .card-arrow { display: none; }
    }
  `
})
export class MenuPage {
  private readonly menuId = inject(ActivatedRoute).snapshot.data['menu'] as string | undefined;
  readonly menu = navigationMenus.find(item => item.id === this.menuId);
  readonly isHome = !this.menu;
  readonly items = this.menu ? this.menu.children : navigationMenus;
}