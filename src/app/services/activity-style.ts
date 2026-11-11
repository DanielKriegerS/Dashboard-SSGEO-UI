import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';

export const collectiveActivityLabels: Record<string, string> = {
  HOMOLOGATION: 'HO - Homologacao', ADMINISTRATIVE_TASKS: 'Administrativo', PRE_SWAP: 'PS - Pre-SWAP', SWAP: 'SW - SWAP'
};
export interface ActivityStyle { activity: string; color: string | null; }

@Injectable({ providedIn: 'root' })
export class ActivityStyleService {
  private readonly http = inject(HttpClient);
  getAll() { return this.http.get<ActivityStyle[]>(`${API_URL}/activity-styles`); }
  update(activity: string, color: string) {
    return this.http.put<ActivityStyle>(`${API_URL}/activity-styles/${encodeURIComponent(activity)}`, { color });
  }
}