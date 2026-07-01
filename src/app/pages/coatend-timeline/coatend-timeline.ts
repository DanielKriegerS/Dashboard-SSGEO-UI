import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DeveloperModel } from '../../models/developer/DeveloperModel';
import { TimelineCreateModel } from '../../models/timeline/TimelineCreateModel';
import { TimelineModel } from '../../models/timeline/TimelineModel';
import { DeveloperService } from '../../services/developer-service';
import { TimelineService } from '../../services/timeline-service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Activity } from '../../models/components/Activities';
import { CoatendCompleteModel } from '../../models/coatend/CoatendCompleteModel';
import { CoatendService } from '../../services/coatend';

@Component({
  selector: 'app-coatend-timeline',
  imports: [CommonModule, FormsModule],
  templateUrl: './coatend-timeline.html',
  styleUrl: './coatend-timeline.scss',
})
export class CoatendTimelineComponent {

  coatendId!: string;
  coatend?: CoatendCompleteModel;
  timeline: TimelineModel[] = [];
  developers: DeveloperModel[] = [];

  form: TimelineCreateModel = {
    activity: Activity.DEVELOPMENT,
    startDate: '',
    endDate: '',
    developerId: ''
  };

  activityLabels: Record<Activity, string> = {
    [Activity.DEVELOPMENT]: 'Desenvolvimento',
    [Activity.TESTING_TU]: 'Teste TU',
    [Activity.PASSAGE_TH]: 'Passagem TH',
    [Activity.HOMOLOGATION]: 'Homologação',
    [Activity.ADMINISTRATIVE_TASKS]: 'Administrativo',
    [Activity.PRE_SWAP]: 'Pré Swap',
    [Activity.SWAP]: 'Swap'
  };
  
  activities = Object.values(Activity);

  constructor(
    private route: ActivatedRoute,
    private timelineService: TimelineService,
    private developerService: DeveloperService,
    private coatendService: CoatendService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id')!;

      this.coatendId = id;

      this.loadCoatend(id);
      this.loadTimeline(id);
      this.loadDevelopers();
    });
  }

  loadCoatend(id: string) {
    this.coatendService.getById(id)
      .subscribe(res => {
        this.coatend = res;
        this.cdr.detectChanges();
      });
  }

loadTimeline(coatendId: string) {
  this.timelineService.getByCoatend(coatendId)
    .subscribe(res => {
      this.timeline = res;
      this.cdr.detectChanges();
    });
}

  loadDevelopers() {
    this.developerService.getAll()
      .subscribe(res => this.developers = res);
  }

  create() {

    if (!this.form.activity || !this.form.developerId) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    this.timelineService.create(this.coatendId, this.form)
      .subscribe(() => {
        this.resetForm();
        this.loadTimeline(this.coatendId);
      });
  }

  resetForm() {
    this.form = {
      activity: Activity.DEVELOPMENT,
      startDate: '',
      endDate: '',
      developerId: ''
    };
  }
}