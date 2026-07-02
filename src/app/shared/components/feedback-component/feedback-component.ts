import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FeedbackService } from '../../../services/feedback';
import { Observable } from 'rxjs';
import { FeedbackMessage } from '../../../models/feedback/FeedbackMessage';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback-component.html',
  styleUrl: './feedback-component.scss',
})
export class FeedbackComponent {

  message$!: Observable<FeedbackMessage | null>;

  constructor(private feedbackService: FeedbackService) {
    this.message$ = this.feedbackService.message$;
  }

  close(): void {
    this.feedbackService.clear();
  }

  getAlertClass(type: string): string {
    const map: Record<string, string> = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    };

    return map[type] || 'alert-info';
  }
}