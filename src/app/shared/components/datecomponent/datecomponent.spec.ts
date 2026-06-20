import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Datecomponent } from './datecomponent';

describe('Datecomponent', () => {
  let component: Datecomponent;
  let fixture: ComponentFixture<Datecomponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Datecomponent],
    }).compileComponents();

    fixture = TestBed.createComponent(Datecomponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
