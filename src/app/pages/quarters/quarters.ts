import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card';
import { Quarter as QuarterService } from '../../services/quarter';
import { RouterLink } from '@angular/router';
import { QuarterSummary } from '../../models/quarter/QuarterSummary';

@Component({
  standalone: true,
  imports: [CommonModule, CardComponent, RouterLink],
  templateUrl: './quarters.html'
})
export class QuartersComponent {

  quarters: QuarterSummary[] = [];
  startIndex = 0;

  constructor(private service: QuarterService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.service.getAll().subscribe(res => {
      this.quarters = res;
    });
  }

  next() {
    if (this.startIndex + 3 < this.quarters.length) {
      this.startIndex += 3;
    }
  }

  prev() {
    if (this.startIndex - 3 >= 0) {
      this.startIndex -= 3;
    }
  }

  get visible() {
    return this.quarters.slice(this.startIndex, this.startIndex + 3);
  }
}
