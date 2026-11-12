import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarComponent } from './sidebar';
import { provideRouter, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthenticationService } from '../../../services/authentication';
import { MembershipAccessService } from '../../../services/membership-access';

@Component({ selector: 'app-export-toolbar', template: '', inputs: ['fullWidth', 'collapsed'] })
class ExportToolbarStub {}
import { ExportToolbar } from '../export-toolbar/export-toolbar';

describe('Sidebar', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  const user = signal({ role: 'ADMIN' });

  beforeEach(async () => {
    user.set({ role: 'ADMIN' });
    await TestBed.configureTestingModule({
      imports: [SidebarComponent], providers: [provideRouter([]),
        { provide: AuthenticationService, useValue: { state: signal('active'), user } },
        { provide: MembershipAccessService, useValue: { globalStatus: () => of({ globalAdmin: false }) } }]
    }).overrideComponent(SidebarComponent, { remove: { imports: [ExportToolbar] }, add: { imports: [ExportToolbarStub] } }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the global area prominently alongside team navigation when authorized', async () => {
    const status = vi.spyOn(TestBed.inject(MembershipAccessService), 'globalStatus')
      .mockReturnValue(of({ globalAdmin: true }));
    const globalFixture = TestBed.createComponent(SidebarComponent);
    await globalFixture.whenStable();
    const links = Array.from(globalFixture.nativeElement.querySelectorAll('.menu > li > a')) as HTMLAnchorElement[];
    expect(status).toHaveBeenCalled();
    expect(links[0].getAttribute('href')).toBe('/global-administration');
    expect(links[0].textContent).toContain('Solicitações de equipes');
    expect(globalFixture.nativeElement.querySelector('a[href="/admin"]')).not.toBeNull();
    globalFixture.destroy();
  });

  it('starts administration closed even on an administration page', async () => {
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/admin/features');
    const adminFixture = TestBed.createComponent(SidebarComponent);
    await adminFixture.whenStable();
    expect(adminFixture.nativeElement.querySelector('#submenu-admin').hidden).toBe(true);
    adminFixture.componentInstance.toggleMenu('admin');
    await adminFixture.whenStable();
    expect(adminFixture.nativeElement.querySelector('#submenu-admin').hidden).toBe(false);
    adminFixture.destroy();
  });

  it('opens a menu page and reveals its submenu in the required order', async () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.map(link => (link.querySelector('.menu-label') || link).textContent?.trim())).toEqual([
      'Home', 'Planejamento', 'Planner', 'Quarters', 'Sprints', 'Coatends', 'Incidentes', 'Administração', 'Features', 'Desenvolvedores', 'Pedidos e Membros', 'Manutenção Equipe'
    ]);
    expect(links.find(link => link.textContent?.trim() === 'Incidentes')?.getAttribute('href')).toBe('/incidents');
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

  it('shows both administration screens only for admins inside the closed group', async () => {
    user.set({ role: 'MEMBER' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#submenu-admin')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/features"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/developers"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/members"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin/team"]')).toBeNull();
    user.set({ role: 'ADMIN' });
    await fixture.whenStable();
    const submenu = fixture.nativeElement.querySelector('#submenu-admin');
    expect(submenu.hidden).toBe(true);
    expect(submenu.querySelector('a[href="/admin/members"]').textContent).toBe('Pedidos e Membros');
    expect(submenu.querySelector('a[href="/admin/team"]').textContent).toBe('Manutenção Equipe');
  });
});
