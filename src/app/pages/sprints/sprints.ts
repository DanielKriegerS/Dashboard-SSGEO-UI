import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CardComponent } from '../../shared/components/card/card';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SprintService } from '../../services/sprint';
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";
import { FormField } from '../../models/components/FormField';
import { Dynamicformcomponent } from "../../shared/components/dynamicformcomponent/dynamicformcomponent";
import { SprintSummary } from '../../models/sprint/SprintSummary';
import { SprintCreateModel } from '../../models/sprint/SprintCreateModel';

@Component({
  selector: 'app-sprints',
  imports: [CommonModule, CardComponent, RouterLink, Notfoundfallback, Dynamicformcomponent],
  templateUrl: './sprints.html',
  styleUrl: './sprints.scss',
})

export class SprintsComponent implements OnInit {

  sprints: SprintSummary[] = [];
  visible: SprintSummary[] = [];
  startIndex = 0;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private service: SprintService,
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
    this.sprints = res;
    this.startIndex = 0;
    this.updateVisible();
    this.loading = false;
    this.cdr.detectChanges();
  });
}

updateVisible() {
  this.visible = this.sprints.slice(this.startIndex, this.startIndex + 3);
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

  createSprint = (data: SprintCreateModel) => {
      this.service.create(data).subscribe(() => this.load());
  }
}
