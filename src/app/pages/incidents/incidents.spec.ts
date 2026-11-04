import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Incidents } from './incidents';
import { IncidentService } from '../../services/incident';

describe('Incidents page', () => {
  const service = { getAll: vi.fn() };
  beforeEach(async () => {
    service.getAll.mockReset().mockReturnValue(of([]));
    await TestBed.configureTestingModule({ imports: [Incidents], providers: [provideRouter([]),
      { provide: IncidentService, useValue: service }
    ] }).compileComponents();
  });
  it('distinguishes an empty list from a loading error', async () => {
    const fixture = TestBed.createComponent(Incidents);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Nenhum Incidente cadastrado');
    service.getAll.mockReturnValue(throwError(() => new Error('Failure')));
    fixture.componentInstance.load();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum Incidente cadastrado');
  });
});