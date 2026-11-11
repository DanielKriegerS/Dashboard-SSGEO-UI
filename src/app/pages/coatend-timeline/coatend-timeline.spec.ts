import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoatendTimelineComponent } from './coatend-timeline';
import { ActivatedRoute } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { DeveloperService } from '../../services/developer-service';
import { TimelineService } from '../../services/timeline-service';
import { CoatendService } from '../../services/coatend';
import { FeedbackService } from '../../services/feedback';

describe('CoatendTimeline', () => {
  let component: CoatendTimelineComponent;
  let fixture: ComponentFixture<CoatendTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoatendTimelineComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: EMPTY } },
        { provide: DeveloperService, useValue: { getAll: () => of([
          { id: 'active', name: 'Ativo', color: '#123456', eligibleForNewAssignment: true },
          { id: 'inactive', name: 'Inativo', color: '#abcdef', eligibleForNewAssignment: false },
          { id: 'legacy', name: 'Sem vinculo', color: '#112233' }
        ]) } },
        { provide: TimelineService, useValue: {} }, { provide: CoatendService, useValue: {} },
        { provide: FeedbackService, useValue: { success: vi.fn() } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoatendTimelineComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('offers eligible new executors without modifying historical timeline records', () => {
    component.loadDevelopers();
    expect(component.developers.map(developer => developer.id)).toEqual(['active']);
    expect(component.timeline).toEqual([]);
  });
});
