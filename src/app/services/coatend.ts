import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';
import { CoatendSummary } from '../models/coatend/CoatendSummary';
import { Observable } from 'rxjs';
import { CoatendMoveModel } from '../models/coatend/CoatendMoveModel';
import { CoatendCompleteModel } from '../models/coatend/CoatendCompleteModel';
import { CoatendModel } from '../models/coatend/CoatendModel';

@Injectable({ providedIn: 'root' })
export class CoatendService {
  private baseUrl = `${API_URL}/coatends`;

  constructor(private http: HttpClient) {}

  create(coatend: CoatendModel) : Observable<CoatendModel> {
    return this.http.post<CoatendModel>(`${API_URL}/coatends`, coatend);
  }

  getAll() : Observable<CoatendSummary[]> {
    return this.http.get<CoatendSummary[]>(this.baseUrl);
  }

  getById(id: string) : Observable<CoatendCompleteModel> {
    return this.http.get<CoatendCompleteModel>(`${this.baseUrl}/${id}`);
  }

  update(id: string, payload: CoatendModel) : Observable<CoatendCompleteModel> {
    return this.http.put<CoatendCompleteModel>(`${this.baseUrl}/${id}`, payload);
  }

  updateCoatendSprint(coatendId: string, payload: CoatendMoveModel) {
    return this.http.patch(`${this.baseUrl}/${coatendId}/move`, payload);
  }
}