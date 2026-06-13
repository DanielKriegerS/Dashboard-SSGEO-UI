import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card';
import { Quarter as QuarterService } from '../../services/quarter';
import { RouterLink } from '@angular/router';
import { QuarterSummary } from '../../models/quarter/QuarterSummary';
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";
import { Dynamicformcomponent } from "../../shared/components/dynamicformcomponent/dynamicformcomponent";
import { FormField } from '../../models/components/FormField';
import { QuarterCreateModel } from '../../models/quarter/QuarterCreateModel';

@Component({
  standalone: true,
  imports: [CommonModule, CardComponent, RouterLink, Notfoundfallback, Dynamicformcomponent],
  templateUrl: './quarters.html'
})
export class QuartersComponent {

  quarters: QuarterSummary[] = [];
  visible: QuarterSummary[] = [];
  startIndex = 0;
  loading = true;

  constructor(
    private service: QuarterService,
    private cdr: ChangeDetectorRef
  ) {}


  fields: FormField[] = [
    { name: 'description', label: 'Descrição', type: 'text' },
    { name: 'startDate', label: 'Data início', type: 'date' },
    { name: 'endDate', label: 'Data fim', type: 'date' }
  ];

  ngOnInit(): void {
    this.load();
  }

load() {
  this.service.getAll().subscribe(res => {
    this.quarters = res;
    this.startIndex = 0;
    this.updateVisible();
    this.loading = false;
    this.cdr.detectChanges();
  });
}

updateVisible() {
  this.visible = this.quarters.slice(this.startIndex, this.startIndex + 3);
}

next() {
  if (this.startIndex + 3 < this.quarters.length) {
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

  createQuarter = (data : QuarterCreateModel) => {
    this.service.create(data).subscribe(() => this.load());
  };
}
