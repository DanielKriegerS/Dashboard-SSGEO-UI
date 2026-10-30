import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarComponent } from './sidebar';
import { provideRouter } from '@angular/router';
import { Component } from '@angular/core';

@Component({ selector: 'app-export-toolbar', template: '', inputs: ['fullWidth', 'collapsed'] })
class ExportToolbarStub {}
import { ExportToolbar } from '../export-toolbar/export-toolbar';

describe('Sidebar', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent], providers: [provideRouter([])]
    }).overrideComponent(SidebarComponent, { remove: { imports: [ExportToolbar] }, add: { imports: [ExportToolbarStub] } }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens a menu page and reveals its submenu in the required order', async () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.map(link => (link.querySelector('.menu-label') || link).textContent?.trim())).toEqual([
      'Home', 'Planejamento', 'Planner', 'Quarters', 'Sprints', 'Coatends', 'Administração', 'Features', 'Desenvolvedores'
    ]);
    component.openMenu('planning');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#submenu-planning').hidden).toBe(false);
    component.toggleMenu('planning');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#submenu-planning').hidden).toBe(true);
  });

  it('expands the sidebar when opening a collapsed group', async () => {
    component.collapsed = true;
    component.openMenu('admin');
    await fixture.whenStable();
    expect(component.collapsed).toBe(false);
    expect(fixture.nativeElement.querySelector('#submenu-admin').hidden).toBe(false);
  });
});
