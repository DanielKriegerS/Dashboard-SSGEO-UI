import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { QuarterSummary } from '../models/quarter/QuarterSummary';
import { QuarterSimple } from '../models/quarter/QuarterSimple';

@Injectable({
  providedIn: 'root'
})
export class Quarter {

  private baseUrl = `${API_URL}/quarters`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<QuarterSummary[]> {
    return this.http.get<QuarterSummary[]>(this.baseUrl);
  }

  getById(id: string): Observable<QuarterSummary> {
    return this.http.get<QuarterSummary>(`${this.baseUrl}/${id}`);
  }

  create(data: { description: string }): Observable<QuarterSimple> {
    return this.http.post<QuarterSimple>(this.baseUrl, data);
  }
}