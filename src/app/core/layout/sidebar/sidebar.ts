import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { inject } from '@angular/core';
import { navigationMenus } from '../../../shared/navigation';
import { ExportToolbar } from '../export-toolbar/export-toolbar';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule, ExportToolbar],
  styleUrls: ['./sidebar.scss'],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  collapsed = false;
  readonly menus = navigationMenus;
  private readonly router = inject(Router);
  readonly expandedMenus = signal<string[]>(navigationMenus
    .filter(menu => this.router.url.startsWith(menu.path) || menu.children.some(item => this.router.url.startsWith(item.path)))
    .map(menu => menu.id));

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