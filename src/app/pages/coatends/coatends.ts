import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CoatendService } from '../../services/coatend';
import { CoatendSummary } from '../../models/coatend/CoatendSummary';
import { CardComponent } from "../../shared/components/card/card";
import { CommonModule } from '@angular/common';
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";
import { FormField } from '../../models/components/FormField';
import { Dynamicformcomponent } from "../../shared/components/dynamicformcomponent/dynamicformcomponent";
import { CoatendCreateModel } from '../../models/coatend/CoatendCreateModel';

@Component({
  imports: [CardComponent, RouterLink, CommonModule, Notfoundfallback, Dynamicformcomponent],
  standalone: true,
  templateUrl: './coatends.html',
  styleUrl: './coatends.scss',
})
export class CoatendsComponent implements OnInit {
  coatends: CoatendSummary[] = [];
  visible: CoatendSummary[] = [];
  startIndex = 0;
  loading = true;

fields: FormField[] = [
  { name: 'description', label: 'Descrição', type: 'text' },
  { name: 'coatendNumber', label: 'Número', type: 'number' }
];

  constructor(
    private route: ActivatedRoute,
    private service: CoatendService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

load() {
  this.service.getAll().subscribe(res => {
    this.coatends = res;
    this.startIndex = 0;
    this.updateVisible();
    this.loading = false;
    this.cdr.detectChanges();
  });
}

updateVisible() {
  this.visible = this.coatends.slice(this.startIndex, this.startIndex + 3);
}

next() {
  if (this.startIndex + 3 < this.coatends.length) {
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

  createCoatend = (data: CoatendCreateModel) => {
      this.service.create(data).subscribe(() => this.load());
  };

}
