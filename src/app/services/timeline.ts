import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class TimelineService {

  private baseUrl = `${API_URL}/timeline`;

  constructor(private http: HttpClient) {}

  addEntry(coatendId: string, payload: any) {
    return this.http.post(`${API_URL}/coatends/${coatendId}/timeline`, payload);
  }

  update(id: string, payload: any) {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }
}
