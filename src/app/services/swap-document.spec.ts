import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SwapDocumentService } from './swap-document';
import { API_URL } from '../config/api.config';

describe('SwapDocumentService', () => {
  it('sends a multipart selection containing only confirmed Coatends and the original files', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(SwapDocumentService);
    const http = TestBed.inject(HttpTestingController);
    const file = new File(['xlsx'], 'COATEND8579.xlsx');
    service.generate({
      date: '2026-11-18', confirmed: [{ id: 'c1', coatendNumber: 8579, description: 'Confirmada' }],
      pending: [{ id: 'p1', coatendNumber: 8753, description: 'Pendente' }]
    }, [file]).subscribe();
    const request = http.expectOne(`${API_URL}/swap/documents`);
    expect(request.request.method).toBe('POST');
    const form = request.request.body as FormData;
    const blob = form.get('selection') as Blob;
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(JSON.parse(text)).toEqual({ date: '2026-11-18', coatends: [{ id: 'c1', number: 8579, description: 'Confirmada' }], incidents: [] });
    expect((form.get('files') as File).name).toBe(file.name);
    request.flush({ fileName: 'swap.docx', documentBase64: 'UEs=', review: 'Revisao' });
    http.verify();
  });

  it('includes confirmed Incidents with exact textual codes and excludes pending Incidents', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(SwapDocumentService).generate({ date: '2026-11-11', confirmed: [], pending: [],
      confirmedIncidents: [{ id: 'i1', code: 'INC0001769649', description: 'Ícone Prime', completed: true }],
      pendingIncidents: [{ id: 'i2', code: 'INC2', description: 'Pendente', completed: false }]
    }, [new File(['xlsx'], 'INC0001769649.xlsx')]).subscribe();
    const request = http.expectOne(`${API_URL}/swap/documents`);
    const blob = (request.request.body as FormData).get('selection') as Blob;
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(JSON.parse(text)).toEqual({ date: '2026-11-11', coatends: [],
      incidents: [{ id: 'i1', code: 'INC0001769649', description: 'Ícone Prime' }] });
    request.flush({ fileName: 'swap.docx', documentBase64: 'UEs=', review: 'Revisao' });
    http.verify();
  });
});