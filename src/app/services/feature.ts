import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../config/api.config';
import { FeatureCoatendModel, FeatureModel, FeatureRequest } from '../models/feature/FeatureModel';
import { FeaturePlanningModel } from '../models/feature/FeaturePlanningModel';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/features`;

  getAll() { return this.http.get<FeatureModel[]>(this.url); }
  getById(id: string) { return this.http.get<FeatureModel>(`${this.url}/${id}`); }
  getPlanning(id: string) { return this.http.get<FeaturePlanningModel>(`${this.url}/${id}/planning`); }
  create(request: FeatureRequest) { return this.http.post<FeatureModel>(this.url, request); }
  update(id: string, request: FeatureRequest) { return this.http.put<FeatureModel>(`${this.url}/${id}`, request); }
  delete(id: string) { return this.http.delete<void>(`${this.url}/${id}`); }
  link(featureId: string, coatendId: string, weight: number | null) {
    return this.http.put<FeatureCoatendModel>(`${this.url}/${featureId}/coatends/${coatendId}`, { weight });
  }
  unlink(featureId: string, coatendId: string) {
    return this.http.delete<void>(`${this.url}/${featureId}/coatends/${coatendId}`);
  }
}