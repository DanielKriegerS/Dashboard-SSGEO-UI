import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarouselNavigator } from './carousel-navigator';

describe('CarouselNavigator', () => {
  let component: CarouselNavigator;
  let fixture: ComponentFixture<CarouselNavigator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarouselNavigator],
    }).compileComponents();

    fixture = TestBed.createComponent(CarouselNavigator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
