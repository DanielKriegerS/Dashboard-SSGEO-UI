import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoatendTimeline } from './coatend-timeline';

describe('CoatendTimeline', () => {
  let component: CoatendTimeline;
  let fixture: ComponentFixture<CoatendTimeline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoatendTimeline],
    }).compileComponents();

    fixture = TestBed.createComponent(CoatendTimeline);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
