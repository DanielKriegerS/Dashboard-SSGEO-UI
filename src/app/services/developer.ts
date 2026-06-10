import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DeveloperService {

  private baseUrl = `${API_URL}/developers`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get(this.baseUrl);
  }

  create(payload: any) {
    return this.http.post(this.baseUrl, payload);
  }
}