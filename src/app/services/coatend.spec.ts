import { TestBed } from '@angular/core/testing';

import { Coatend } from './coatend';

describe('Coatend', () => {
  let service: Coatend;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Coatend);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
