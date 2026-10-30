import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ConnectionState } from './services/connection-state';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('keeps routed content visible before retries are exhausted', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('.connection-fallback')).toBeNull();
  });

  it('replaces routed content with an actionable fallback after exhaustion', async () => {
    const fixture = TestBed.createComponent(App);
    const connection = TestBed.inject(ConnectionState);
    const reload = vi.spyOn(connection, 'reload').mockImplementation(() => undefined);
    connection.unavailable.set(true);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeNull();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain('três tentativas');
    compiled.querySelector<HTMLButtonElement>('.connection-fallback button')?.click();
    expect(reload).toHaveBeenCalledOnce();
  });
});
