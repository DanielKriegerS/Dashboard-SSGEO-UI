import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamicEditComponent } from './dynamic-edit-component';

describe('DynamicEditComponent', () => {
  let component: DynamicEditComponent;
  let fixture: ComponentFixture<DynamicEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicEditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicEditComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
