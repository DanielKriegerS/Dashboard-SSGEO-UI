import { TestBed } from '@angular/core/testing';

import { Quarter } from './quarter';

describe('Quarter', () => {
  let service: Quarter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Quarter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
