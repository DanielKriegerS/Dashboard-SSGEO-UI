import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MenuPage } from './menu';

describe('Menu pages', () => {
  for (const [menu, labels] of [
    [undefined, ['Planejamento', 'Administração']],
    ['planning', ['Planner', 'Quarters', 'Sprints', 'Coatends']],
    ['admin', ['Features', 'Desenvolvedores']]
  ] as const) {
    it(`shows only the cards for ${menu || 'home'}`, async () => {
      TestBed.configureTestingModule({ providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { menu } } } }] });
      const fixture = TestBed.createComponent(MenuPage);
      await fixture.whenStable();
      const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
      expect(links.map(link => link.textContent?.trim())).toEqual([...labels]);
      expect(!!fixture.nativeElement.querySelector('.brand-wordmark')).toBe(!menu);
    });
  }
});