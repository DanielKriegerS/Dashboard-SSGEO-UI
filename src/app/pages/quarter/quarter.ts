import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardComponent } from '../../shared/components/card/card';
import { Quarter } from '../../services/quarter';
import { SprintSummary } from '../../models/sprint/SprintSummary';
import { QuarterModel } from '../../models/quarter/QuarterModel';
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";
import { CarouselNavigator } from "../../shared/components/carousel-navigator/carousel-navigator";
import { Datecomponent } from "../../shared/components/datecomponent/datecomponent";
import { QuarterUpdatePayload } from '../../models/quarter/QuarterUpdatePayload';
import { FormField } from '../../models/components/FormField';
import { DynamicEditComponent } from "../../shared/components/dynamic-edit-component/dynamic-edit-component";
import { DeleteButton } from "../../shared/components/delete-button/delete-button";
import { FeedbackService } from '../../services/feedback';

@Component({
  standalone: true,
  imports: [CommonModule, CardComponent, RouterLink, Notfoundfallback, CarouselNavigator, Datecomponent, DynamicEditComponent, DeleteButton],
  styleUrls: ['./quarter.scss'],
  templateUrl: './quarter.html'
})
export class QuarterComponent implements OnInit {

  quarter!: QuarterModel;
  sprints: SprintSummary[] = [];
  visibleSprints: SprintSummary[] = [];
  startIndex = 0;
  description = '';
  quarterToUpdate! : QuarterUpdatePayload;

    editFields: FormField[] = [
      { name: 'description', label: 'Descrição', type: 'text' },
      { name: 'startDate', label: 'Data início', type: 'date' },
      { name: 'endDate', label: 'Data fim', type: 'date' }
    ];

  constructor(
    private route: ActivatedRoute,
    private service: Quarter,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private feedback: FeedbackService
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
    this.description = res.description;
    this.updateVisible();

    this.quarterToUpdate = {
      description : res.description,
      startDate : res.startDate,
      endDate : res.endDate
    };

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

  updateQuarter = (data: QuarterUpdatePayload) => {
  
  const payload = {
    description: data.description,
    ...(data.startDate && { startDate: data.startDate + 'T00:00:00' }),
    ...(data.endDate && { endDate: data.endDate + 'T00:00:00' })
  
  };
  
  this.service.update(this.quarter.id, payload)
    .subscribe(() => {
      this.feedback.success('Trimestre atualizado com sucesso!');
      this.load(this.quarter.id)
    });      
  };

  deleteQuarter = () => {
    this.service.delete(this.quarter.id)
      
    .subscribe(() => {
      this.feedback.success('Quarter excluído com sucesso.');
      this.router.navigate(['/quarters']);
    });
  };
}