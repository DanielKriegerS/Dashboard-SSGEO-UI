import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoatendService } from '../../services/coatend';
import { CommonModule } from '@angular/common';
import { CoatendModel } from '../../models/coatend/CoatendModel';
import { MoveTo } from "../../shared/components/move-to/move-to";
import { CoatendMoveModel } from '../../models/coatend/CoatendMoveModel';
import { SprintService } from '../../services/sprint';

@Component({
  standalone: true,
  templateUrl: './coatend.html',
  imports: [CommonModule, MoveTo]
})
export class CoatendComponent implements OnInit {

  coatend!: CoatendModel;
  sprintsOptions: { id: string; label: string }[] = [];

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
}