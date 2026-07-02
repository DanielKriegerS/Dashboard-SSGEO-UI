import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FeedbackMessage } from '../models/feedback/FeedbackMessage';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {

  private messageSubject = new BehaviorSubject<FeedbackMessage | null>(null);

  message$ = this.messageSubject.asObservable();

  success(message: string): void {
    this.show({
      type: 'success',
      message
    });
  }

  error(message: string): void {
    this.show({
      type: 'error',
      message
    });
  }

  warning(message: string): void {
    this.show({
      type: 'warning',
      message
    });
  }

  info(message: string): void {
    this.show({
      type: 'info',
      message
    });
  }

  clear(): void {
    this.messageSubject.next(null);
  }

  private show(message: FeedbackMessage): void {
    this.messageSubject.next(message);

    setTimeout(() => {
      this.clear();
    }, 3500);
  }
}