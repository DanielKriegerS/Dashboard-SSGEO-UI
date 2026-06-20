import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SprintSummary } from '../models/sprint/SprintSummary';
import { SprintCreateModel } from '../models/sprint/SprintCreateModel';
import { SprintCompleteModel } from '../models/sprint/SprintCompleteModel';
import { SprintMoveModel } from '../models/sprint/SprintMoveModel';

@Injectable({ providedIn: 'root' })
export class SprintService {

  private baseUrl = `${API_URL}/sprints`;

  constructor(private http: HttpClient) {}

  getAll() : Observable<SprintSummary[]>{
    return this.http.get<SprintSummary[]>(this.baseUrl);
  }
  
  getById(id: string) : Observable<SprintCompleteModel> {
    return this.http.get<SprintCompleteModel>(`${this.baseUrl}/${id}`);
  }

  create(sprint: SprintCreateModel) {
    return this.http.post(`${API_URL}/sprints`, sprint);
  }

  updateSprintQuarter(sprintId: string, payload: SprintMoveModel) {
    return this.http.patch(`${this.baseUrl}/${sprintId}/move`, payload);
  }
}
