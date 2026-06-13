import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coatends } from './coatends';

describe('Coatends', () => {
  let component: Coatends;
  let fixture: ComponentFixture<Coatends>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coatends],
    }).compileComponents();

    fixture = TestBed.createComponent(Coatends);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
