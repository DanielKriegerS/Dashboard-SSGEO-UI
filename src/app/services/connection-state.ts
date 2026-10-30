import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectionState {
  readonly unavailable = signal(false);

  reload(): void {
    window.location.reload();
  }
}