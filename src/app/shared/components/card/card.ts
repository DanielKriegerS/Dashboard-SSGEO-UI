
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.html'
})
export class CardComponent implements OnInit{
  @Input() title = '';
  @Input() subtitle = '';
  @Input() startDate: String | null = null;
  @Input() endDate: String | null = null;

  ngOnInit(): void {
    this.completeDates();
  }

  private completeDates() {
    if (this.startDate !== null) {
      this.startDate = 'Data início: ' + this.startDate;
    }

    if (this.endDate !== null) {
      this.endDate = 'Data fim: ' + this.endDate;
    }
  }
}
