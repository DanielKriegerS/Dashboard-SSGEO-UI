import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Quarter } from './quarter';

describe('Quarter', () => {
  let component: Quarter;
  let fixture: ComponentFixture<Quarter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Quarter],
    }).compileComponents();

    fixture = TestBed.createComponent(Quarter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
