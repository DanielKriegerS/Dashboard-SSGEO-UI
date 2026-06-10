import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoatendComponent } from './coatend';

describe('CoatendComponent', () => {
  let component: CoatendComponent;
  let fixture: ComponentFixture<CoatendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoatendComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CoatendComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
