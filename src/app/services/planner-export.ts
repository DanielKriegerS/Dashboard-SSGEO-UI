import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { PlannerExportRequest } from '../models/components/planner/PlannerExportRequest';

@Injectable({ providedIn: 'root' })
export class PlannerExportService {
  constructor(private http: HttpClient) {}

  export(request: PlannerExportRequest): Observable<Blob> {
    const params = new HttpParams({ fromObject: { ...request } });
    return this.http.get(`${API_URL}/planner/export`, { params, responseType: 'blob' });
  }
}
