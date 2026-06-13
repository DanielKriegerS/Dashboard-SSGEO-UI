import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';
import { CoatendSummary } from '../models/coatend/CoatendSummary';
import { Observable } from 'rxjs';
import { CoatendCreateModel } from '../models/coatend/CoatendCreateModel';

@Injectable({ providedIn: 'root' })
export class CoatendService {

  private baseUrl = `${API_URL}/coatends`;

  constructor(private http: HttpClient) {}

  create(coatend: CoatendCreateModel) : Observable<CoatendCreateModel> {
    return this.http.post<CoatendCreateModel>(`${API_URL}/coatends`, coatend);
  }

  getAll() : Observable<CoatendSummary[]> {
    return this.http.get<CoatendSummary[]>(this.baseUrl);
  }

  getById(id: string) {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  update(id: string, payload: any) {
    return this.http.put(`${this.baseUrl}/${id}`, payload);
  }
}