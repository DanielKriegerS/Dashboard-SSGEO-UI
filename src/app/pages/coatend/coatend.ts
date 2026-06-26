import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoatendService } from '../../services/coatend';
import { CommonModule } from '@angular/common';
import { CoatendCompleteModel } from '../../models/coatend/CoatendCompleteModel';
import { MoveTo } from "../../shared/components/move-to/move-to";
import { CoatendMoveModel } from '../../models/coatend/CoatendMoveModel';
import { SprintService } from '../../services/sprint';
import { CoatendModel } from '../../models/coatend/CoatendModel';
import { DynamicEditComponent } from "../../shared/components/dynamic-edit-component/dynamic-edit-component";
import { FormField } from '../../models/components/FormField';

@Component({
  standalone: true,
  templateUrl: './coatend.html',
  imports: [CommonModule, MoveTo, DynamicEditComponent]
})
export class CoatendComponent implements OnInit {

  coatend!: CoatendCompleteModel;
  sprintsOptions: { id: string; label: string }[] = [];
  coatendToUpdate! : CoatendModel;

  editFields: FormField[] = [
    { name: 'description', label: 'Descrição', type: 'text' },
    { name: 'coatendNumber', label: 'Número da Coatend', type: 'number' },
  ];
  

  constructor(
    private route: ActivatedRoute,
    private service: CoatendService,
    private sprintService: SprintService,
    private cdr: ChangeDetectorRef
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
}