import { TestBed } from '@angular/core/testing';

import { Sprint } from './sprint';

describe('Sprint', () => {
  let service: Sprint;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Sprint);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
