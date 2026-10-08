import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  styleUrls: ['./sidebar.scss'],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  collapsed = false;
  toggle() { this.collapsed = !this.collapsed; }
}
