import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './core/layout/sidebar/sidebar';
import { FeedbackComponent } from "./shared/components/feedback-component/feedback-component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, FeedbackComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('dashboardSSGEO-ui');
}
