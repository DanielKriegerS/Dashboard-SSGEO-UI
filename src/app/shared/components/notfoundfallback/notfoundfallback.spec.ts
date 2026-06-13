import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Notfoundfallback } from './notfoundfallback';

describe('Notfoundfallback', () => {
  let component: Notfoundfallback;
  let fixture: ComponentFixture<Notfoundfallback>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notfoundfallback],
    }).compileComponents();

    fixture = TestBed.createComponent(Notfoundfallback);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
