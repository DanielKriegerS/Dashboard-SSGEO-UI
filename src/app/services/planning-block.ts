import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { BlockRequest, PlanningBlock } from '../models/components/planner/PlanningBlock';

@Injectable({ providedIn: 'root' })
export class PlanningBlockService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<PlanningBlock[]> {
    return this.http.get<PlanningBlock[]>(`${API_URL}/blocks`);
  }

  create(request: BlockRequest): Observable<PlanningBlock> {
    return this.http.post<PlanningBlock>(`${API_URL}/blocks`, request);
  }

  update(id: string, request: BlockRequest): Observable<PlanningBlock> {
    return this.http.put<PlanningBlock>(`${API_URL}/blocks/${id}`, request);
  }
}