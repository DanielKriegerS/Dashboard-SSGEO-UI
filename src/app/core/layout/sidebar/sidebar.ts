import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PlannerDisplaySelection } from '../../../models/components/planner/PlannerDisplaySelection';
import { ExportToolbar } from '../export-toolbar/export-toolbar';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, ExportToolbar],
  styleUrls: ['./sidebar.scss'],
  templateUrl: './sidebar.html'
})
export class SidebarComponent {
  collapsed = false;

  toggle(): void {
    this.collapsed = !this.collapsed;
  }
}