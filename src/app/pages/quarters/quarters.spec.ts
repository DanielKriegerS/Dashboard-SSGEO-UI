import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Quarters } from './quarters';

describe('Quarters', () => {
  let component: Quarters;
  let fixture: ComponentFixture<Quarters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Quarters],
    }).compileComponents();

    fixture = TestBed.createComponent(Quarters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
