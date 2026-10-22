import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { SwapDateOption } from '../models/coatend/CoatendMilestoneModel';

export interface SwapDocumentResult {
  fileName: string;
  documentBase64: string;
  review: string;
}

@Injectable({ providedIn: 'root' })
export class SwapDocumentService {
  private readonly http = inject(HttpClient);

  generate(selection: SwapDateOption, files: File[]) {
    const form = new FormData();
    form.append('selection', new Blob([JSON.stringify({
      date: selection.date,
      coatends: selection.confirmed.map(coatend => ({
        id: coatend.id, number: coatend.coatendNumber, description: coatend.description
      }))
    })], { type: 'application/json' }));
    for (const file of files) {
      form.append('files', file, file.name);
    }
    return this.http.post<SwapDocumentResult>(`${API_URL}/swap/documents`, form);
  }
}