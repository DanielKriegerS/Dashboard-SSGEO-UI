
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html'
})
export class CardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() startDate: String | null = null;
  @Input() endDate: String | null = null;
}
