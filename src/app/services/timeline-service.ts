import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimelineModel } from '../models/timeline/TimelineModel';
import { TimelineCreateModel } from '../models/timeline/TimelineCreateModel';
import { API_URL } from '../config/api.config';
import { CoatendPlannerModel } from '../models/components/planner/CoatendPlannerModel';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  constructor(private http: HttpClient) {}

  create(coatendId: string, payload: TimelineCreateModel): Observable<TimelineModel> {
    return this.http.post<TimelineModel>(`${API_URL}/coatends/${coatendId}/timeline`, payload);
  }

  getByCoatend(coatendId: string): Observable<TimelineModel[]> {
    return this.http.get<TimelineModel[]>(`${API_URL}/coatends/${coatendId}/timeline`);
  }

  getAll(): Observable<TimelineModel[]> {
    return this.http.get<TimelineModel[]>(`${API_URL}/timeline`);
  }
}
