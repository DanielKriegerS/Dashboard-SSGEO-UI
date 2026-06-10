import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sprints } from './sprints';

describe('Sprints', () => {
  let component: Sprints;
  let fixture: ComponentFixture<Sprints>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sprints],
    }).compileComponents();

    fixture = TestBed.createComponent(Sprints);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
