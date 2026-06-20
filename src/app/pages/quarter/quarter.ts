import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card';
import { Quarter } from '../../services/quarter';
import { SprintSummary } from '../../models/sprint/SprintSummary';
import { QuarterModel } from '../../models/quarter/QuarterModel';
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";
import { CarouselNavigator } from "../../shared/components/carousel-navigator/carousel-navigator";
import { Datecomponent } from "../../shared/components/datecomponent/datecomponent";

@Component({
  standalone: true,
  imports: [CommonModule, CardComponent, RouterLink, Notfoundfallback, CarouselNavigator, Datecomponent],
  styleUrls: ['./quarter.scss'],
  templateUrl: './quarter.html'
})
export class QuarterComponent implements OnInit {

  quarter?: QuarterModel;
  sprints: SprintSummary[] = [];
  visibleSprints: SprintSummary[] = [];
  startIndex = 0;
  description = '';

  constructor(
    private route: ActivatedRoute,
    private service: Quarter,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
    const id = params.get('id')!;
    this.load(id);
   });
  }

  load(id: string) {
  this.service.getById(id).subscribe(res => {
    this.quarter = res;
    this.sprints = res.sprints || [];
    console.log(this.sprints)
    this.description = res.description;
    this.updateVisible();

    this.cdr.detectChanges(); 
  });
}

  updateVisible() {
  this.visibleSprints = this.sprints.slice(this.startIndex, this.startIndex + 3);
}

next() {
  if (this.startIndex + 3 < this.sprints.length) {
    this.startIndex += 3;
    this.updateVisible();
  }
}

  prev() {
    if (this.startIndex - 3 >= 0) {
      this.startIndex -= 3;
      this.updateVisible();
    }
  }  
}