import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card';
import { Quarter } from '../../services/quarter';
import { SprintSummary } from '../../models/sprint/SprintSummary';
import { QuarterSummary } from '../../models/quarter/QuarterSummary';

@Component({
  standalone: true,
  imports: [CommonModule, CardComponent, RouterLink],
  templateUrl: './quarter.html'
})
export class QuarterComponent implements OnInit {

  quarter?: QuarterSummary;
  sprints?: SprintSummary[];
  startIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private service: Quarter
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getById(id).subscribe(res => {
      this.quarter = res;
    });
  }

  next() {
    if (this.startIndex + 3 < (this.quarter?.sprints || 0)) {
      this.startIndex += 3;
    }
  }

  prev() {
    if (this.startIndex - 3 >= 0) {
      this.startIndex -= 3;
    }
  }

  get visibleSprints() {
    const totalSprints = this.quarter?.sprints ?? 0;
    const endIndex = Math.min(totalSprints, this.startIndex + 3);
    return Array.from({ length: Math.max(0, endIndex - this.startIndex) }, (_, i) => this.startIndex + i + 1);
  }
}