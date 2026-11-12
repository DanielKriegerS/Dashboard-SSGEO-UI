import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MenuPage } from './menu';
import { signal } from '@angular/core';
import { AuthenticationService } from '../../services/authentication';

describe('Menu pages', () => {
  for (const [menu, labels] of [
    [undefined, ['Planejamento', 'Administração']],
    ['planning', ['Planner', 'Quarters', 'Sprints', 'Coatends', 'Incidentes']],
    ['admin', ['Features', 'Desenvolvedores']]
  ] as const) {
    it(`shows only the cards for ${menu || 'home'}`, async () => {
      TestBed.configureTestingModule({ providers: [provideRouter([]),
        { provide: AuthenticationService, useValue: { user: signal({ role: 'ADMIN' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { menu } } } }] });
      const fixture = TestBed.createComponent(MenuPage);
      await fixture.whenStable();
      const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
      expect(links.map(link => link.textContent?.trim())).toEqual([...labels]);
      if (menu === 'planning') {
        expect(links.find(link => link.textContent?.trim() === 'Incidentes')?.getAttribute('href')).toBe('/incidents');
      }
      expect(!!fixture.nativeElement.querySelector('.brand-wordmark')).toBe(!menu);
    });
  }

  it('hides the administration card from members and reacts to role changes', async () => {
    const user = signal({ role: 'MEMBER' });
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthenticationService, useValue: { user } },
      { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } }] });
    const fixture = TestBed.createComponent(MenuPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/planning"]')).not.toBeNull();
    user.set({ role: 'ADMIN' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).not.toBeNull();
  });
});