import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './core/layout/sidebar/sidebar';
import { FeedbackComponent } from "./shared/components/feedback-component/feedback-component";
import { ConnectionState } from './services/connection-state';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, FeedbackComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly connection: ConnectionState = inject(ConnectionState);
  protected readonly title = signal('dashboardSSGEO-ui');
}
