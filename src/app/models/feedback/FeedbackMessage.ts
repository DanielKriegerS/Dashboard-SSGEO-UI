export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface FeedbackMessage {
  type: FeedbackType;
  message: string;
}