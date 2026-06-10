import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CoatendService {

  private baseUrl = `${API_URL}/coatends`;

  constructor(private http: HttpClient) {}

  create(sprintId: string, payload: any) {
    return this.http.post(`${API_URL}/sprints/${sprintId}/coatends`, payload);
  }

  getById(id: string) {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  update(id: string, payload: any) {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }
}