import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SprintSummary } from '../models/sprint/SprintSummary';
import { SprintCreateModel } from '../models/sprint/SprintCreateModel';

@Injectable({ providedIn: 'root' })
export class SprintService {

  private baseUrl = `${API_URL}/sprints`;

  constructor(private http: HttpClient) {}

  getAll() : Observable<SprintSummary[]>{
    return this.http.get<SprintSummary[]>(this.baseUrl);
  }
  
  getById(id: string) {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  create(sprint: SprintCreateModel) {
    return this.http.post(`${API_URL}/sprints`, sprint);
  }
}
