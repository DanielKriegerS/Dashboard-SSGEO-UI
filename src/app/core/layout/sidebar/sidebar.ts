import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { inject } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';
import { navigationMenus } from '../../../shared/navigation';
import { AuthenticationService } from '../../../services/authentication';
import { MembershipAccessService } from '../../../services/membership-access';
import { ExportToolbar } from '../export-toolbar/export-toolbar';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule, ExportToolbar],
  styleUrls: ['./sidebar.scss'],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  collapsed = false;
  readonly globalAdmin = signal(false);
  private readonly router = inject(Router);
  readonly auth = inject(AuthenticationService);
  readonly globalOnly = computed(() => this.auth.state() === 'unassigned');
  readonly menus = computed(() => this.globalOnly() ? [] : navigationMenus.filter(menu => menu.id !== 'admin' || this.auth.user()?.role === 'ADMIN'));
  private readonly membership = inject(MembershipAccessService);
  readonly expandedMenus = signal<string[]>(navigationMenus
    .filter(menu => menu.id !== 'admin' && (this.router.url.startsWith(menu.path) || menu.children.some(item => this.router.url.startsWith(item.path))))
    .map(menu => menu.id));

  constructor() {
    toObservable(this.auth.state).pipe(
      switchMap(state => state === 'active' || state === 'unassigned' ? this.membership.globalStatus().pipe(
        map(result => result.globalAdmin), catchError(() => of(false))) : of(false)),
      takeUntilDestroyed()
    ).subscribe(allowed => this.globalAdmin.set(allowed));
  }

  openMenu(id: string): void {
    this.collapsed = false;
    this.expandedMenus.update(menus => menus.includes(id) ? menus : [...menus, id]);
  }

  toggleMenu(id: string): void {
    if (this.collapsed) { this.openMenu(id); return; }
    this.expandedMenus.update(menus => menus.includes(id) ? menus.filter(menu => menu !== id) : [...menus, id]);
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
  }
}