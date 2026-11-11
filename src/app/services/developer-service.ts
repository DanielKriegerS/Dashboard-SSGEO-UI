import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';
import { DeveloperModel } from '../models/developer/DeveloperModel';
import { DeveloperUpdatePayload } from '../models/developer/DeveloperUpdatePayload';

@Injectable({ providedIn: 'root' })
export class DeveloperService {
  private baseUrl = `${API_URL}/developers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DeveloperModel[]> {
    return this.http.get<DeveloperModel[]>(this.baseUrl);
  }

  getEligibleMembers(): Observable<{ membershipId: string; displayName: string }[]> {
    return this.http.get<{ membershipId: string; displayName: string }[]>(`${this.baseUrl}/eligible-members`);
  }

  create(data: Pick<DeveloperModel, 'name' | 'color'> & { membershipId: string }) {
    return this.http.post(this.baseUrl, data);
  }

  update(id: string, payload: DeveloperUpdatePayload): Observable<DeveloperModel> {
    return this.http.patch<DeveloperModel>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}