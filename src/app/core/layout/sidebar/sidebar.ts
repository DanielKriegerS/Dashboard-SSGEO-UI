import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  collapsed = false;
  toggle() { this.collapsed = !this.collapsed; }
}
