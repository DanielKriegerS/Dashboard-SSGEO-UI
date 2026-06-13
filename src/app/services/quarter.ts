import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { QuarterSummary } from '../models/quarter/QuarterSummary';
import { QuarterModel } from '../models/quarter/QuarterModel';
import { QuarterSimple } from '../models/quarter/QuarterSimple';
import { QuarterCreateModel } from '../models/quarter/QuarterCreateModel';

@Injectable({
  providedIn: 'root'
})
export class Quarter {

  private baseUrl = `${API_URL}/quarters`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<QuarterSummary[]> {
    return this.http.get<QuarterSummary[]>(this.baseUrl);
  }

  getById(id: string): Observable<QuarterModel> {
    return this.http.get<QuarterModel>(`${this.baseUrl}/${id}`);
  }

  create(data: QuarterCreateModel): Observable<QuarterSimple> {
    return this.http.post<QuarterSimple>(this.baseUrl, data);
  }
}