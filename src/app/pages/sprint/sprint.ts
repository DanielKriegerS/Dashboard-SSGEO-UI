import { ChangeDetectorRef, Component } from '@angular/core';
import { CardComponent } from "../../shared/components/card/card";
import { Notfoundfallback } from "../../shared/components/notfoundfallback/notfoundfallback";
import { SprintCompleteModel } from '../../models/sprint/SprintCompleteModel';
import { SprintService } from '../../services/sprint';
import { CoatendSummary } from '../../models/coatend/CoatendSummary';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Quarter } from '../../services/quarter';
import { MoveTo } from "../../shared/components/move-to/move-to";
import { SprintMoveModel } from '../../models/sprint/SprintMoveModel';
import { CarouselNavigator } from "../../shared/components/carousel-navigator/carousel-navigator";
import { Datecomponent } from "../../shared/components/datecomponent/datecomponent";
import { DynamicEditComponent } from '../../shared/components/dynamic-edit-component/dynamic-edit-component';
import { FormField } from '../../models/components/FormField';
import { SprintUpdatePayload } from '../../models/sprint/SprintUpdatePayload';
import { DeleteButton } from "../../shared/components/delete-button/delete-button";
 
@Component({
  selector: 'app-sprint',
  imports: [CardComponent, Notfoundfallback, RouterLink, CommonModule, MoveTo, CarouselNavigator, Datecomponent, DynamicEditComponent, DeleteButton],
  templateUrl: './sprint.html',
  styleUrl: './sprint.scss',
})
export class SprintComponent {

  sprint!: SprintCompleteModel;
  coatends: CoatendSummary[] = [];
  visibleCoatends: CoatendSummary[] = [];
  startIndex = 0;
  description: string = '';
  quartersOptions: { id: string; label: string }[] = [];
  quarterId!: SprintMoveModel;
  sprintToUpdate!: SprintUpdatePayload;
  
  editFields: FormField[] = [
    { name: 'description', label: 'Descrição', type: 'text' },
    { name: 'startDate', label: 'Data início', type: 'date' },
    { name: 'endDate', label: 'Data fim', type: 'date' }
  ];

constructor(
  private sprintService: SprintService,
  private quarterService: Quarter,
  private route: ActivatedRoute,
  private cdr: ChangeDetectorRef,
  private router: Router
) {}

ngOnInit() { 
  this.route.paramMap.subscribe(params => {
    const id = params.get('id')!;
    this.load(id);
    this.loadQuarterOptions();
  });
}

load(id: string) {
  this.sprintService.getById(id).subscribe(res => {
    this.sprint = res;
    this.coatends = res.coatends || [];
    this.description = res.description;
    this.updateVisible();

    this.sprintToUpdate = {
        description: res.description,
        startDate: res.startDate,
        endDate: res.endDate
    };

    this.cdr.detectChanges(); 
  });
}

loadQuarterOptions() {
  this.quarterService.getAll().subscribe(res => {
    this.quartersOptions = res.map(q => ({
      id: q.id,
      label: q.description
    }));
  });
}

  updateVisible() {
  this.visibleCoatends = this.coatends.slice(this.startIndex, this.startIndex + 3);
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

  moveSprint = (quarterId: string) => {
    const request: SprintMoveModel = {
      quarterId: quarterId
    };

    this.sprintService
      .updateSprintQuarter(this.sprint.id, request)
      .subscribe(() => {
        this.load(this.sprint.id);
      });
  };
  
  updateSprint = (data: SprintUpdatePayload) => {

  const payload = {
    description: data.description,
    ...(data.startDate && { startDate: data.startDate + 'T00:00:00' }),
    ...(data.endDate && { endDate: data.endDate + 'T00:00:00' })

  };

    this.sprintService.update(this.sprint.id, payload)
      .subscribe(() => this.load(this.sprint.id));      
  };

  deleteSprint = () => {
    this.sprintService.delete(this.sprint.id)
      .subscribe(() => this.router.navigate(['/sprints']));
  };
}
