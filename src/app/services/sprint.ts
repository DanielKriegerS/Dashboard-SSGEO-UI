import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SprintService {

  private baseUrl = `${API_URL}/sprints`;

  constructor(private http: HttpClient) {}

  getById(id: string) {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  create(quarterId: string, payload: any) {
    return this.http.post(`${API_URL}/quarters/${quarterId}/sprints`, payload);
  }
}
