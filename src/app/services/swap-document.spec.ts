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
    expect(JSON.parse(text)).toEqual({ date: '2026-11-18', coatends: [{ id: 'c1', number: 8579, description: 'Confirmada' }] });
    expect((form.get('files') as File).name).toBe(file.name);
    request.flush({ fileName: 'swap.docx', documentBase64: 'UEs=', review: 'Revisao' });
    http.verify();
  });
});