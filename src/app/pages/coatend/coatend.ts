import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CoatendService } from '../../services/coatend';
import { CommonModule } from '@angular/common';
import { CoatendCompleteModel } from '../../models/coatend/CoatendCompleteModel';
import { MoveTo } from "../../shared/components/move-to/move-to";
import { CoatendMoveModel } from '../../models/coatend/CoatendMoveModel';
import { SprintService } from '../../services/sprint';
import { CoatendModel } from '../../models/coatend/CoatendModel';
import { DynamicEditComponent } from "../../shared/components/dynamic-edit-component/dynamic-edit-component";
import { FormField } from '../../models/components/FormField';
import { DeleteButton } from "../../shared/components/delete-button/delete-button";
import { TimelineModel } from '../../models/timeline/TimelineModel';
import { TimelineCreateModel } from '../../models/timeline/TimelineCreateModel';
import { TimelineService } from '../../services/timeline-service';
import { DeveloperService } from '../../services/developer-service';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  templateUrl: './coatend.html',
  imports: [CommonModule, MoveTo, DynamicEditComponent, DeleteButton, FormsModule, RouterLink]
})
export class CoatendComponent implements OnInit {

  coatend!: CoatendCompleteModel;
  sprintsOptions: { id: string; label: string }[] = [];
  coatendToUpdate! : CoatendModel;

  timeline: TimelineModel[] = [];
  developers: { id: string; name: string }[] = [];

  form: TimelineCreateModel = {
    activity: '',
    startDate: '',
    endDate: '',
    developerId: ''
  };

  editFields: FormField[] = [
    { name: 'description', label: 'Descrição', type: 'text' },
    { name: 'coatendNumber', label: 'Número da Coatend', type: 'number' },
  ];
  

  constructor(
    private route: ActivatedRoute,
    private service: CoatendService,
    private sprintService: SprintService,
    private cdr: ChangeDetectorRef,
    private router: Router,    
    private timelineService: TimelineService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id')!;
      this.load(id);
      this.loadSprintOptions()
    });
  }

  load(id: string) {
    this.service.getById(id).subscribe(res => {
      this.coatend = res;
      
      this.coatendToUpdate = {
        description: res.description,
        coatendNumber: res.coatendNumber
      }

      this.cdr.detectChanges(); 
    });
  }

  loadSprintOptions() {
    this.sprintService.getAll().subscribe(res => {
      this.sprintsOptions = res.map(q => ({
        id: q.id,
        label: q.description
      }));
    });
  }

  
  createTimeline() {
    this.timelineService.create(this.coatend.id, this.form)
      .subscribe(() => {
        this.resetForm();
      });
  }

  resetForm() {
    this.form = {
      activity: '',
      startDate: '',
      endDate: '',
      developerId: ''
    };
  }

  moveCoatend = (sprintId: string) => {
    const request: CoatendMoveModel = {
      sprintId: sprintId
    };
  
    this.service
      .updateCoatendSprint(this.coatend.id, request)
      .subscribe(() => {
        this.load(this.coatend.id);
      });
  };

  updateCoatend = (data: CoatendModel) => {
  
    const payload = {
      description: data.description,
      coatendNumber: data.coatendNumber  
    };
    
    this.service.update(this.coatend.id, payload)
      .subscribe(() => this.load(this.coatend.id));      
  };

  deleteCoatend = () => {
    this.service.delete(this.coatend.id)
      .subscribe(() => this.router.navigate(['/coatends']));
  };
}