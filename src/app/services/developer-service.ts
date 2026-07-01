import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { DeveloperModel } from '../models/developer/DeveloperModel';

@Injectable({ providedIn: 'root' })
export class DeveloperService {

  private baseUrl = `${API_URL}/developers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DeveloperModel[]> {
    return this.http.get<DeveloperModel[]>(this.baseUrl);
  }

  create(data: { name: string }) {
    return this.http.post(this.baseUrl, data);
  }
}