import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';

export type OperationalGroup = 'DESENVOLVEDORES' | 'ADMINISTRATIVO' | 'SWAP';
export type MembershipRole = 'ADMIN' | 'MEMBER';
export interface SquadAccess { id: string; name: string; admissionCode: string; }
export interface AdmissionRequest {
  id: string; userId: string; squadId: string; name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; requestedAt: string; decidedAt: string | null;
}
export interface SquadMember {
  id: string; userId: string; name: string; role: MembershipRole;
  operationalGroup: OperationalGroup; active: boolean; accountActive: boolean;
}
export interface MemberChange { role?: MembershipRole; operationalGroup?: OperationalGroup; active?: boolean; }

@Injectable({ providedIn: 'root' })
export class MembershipAccessService {
  private readonly http = inject(HttpClient);
  squad() { return this.http.get<SquadAccess>(`${API_URL}/administration/squad`); }
  ownRequest() { return this.http.get<AdmissionRequest | null>(`${API_URL}/admission-requests/me`); }
  request(code: string) { return this.http.post<AdmissionRequest>(`${API_URL}/admission-requests`, { code }); }
  pending() { return this.http.get<AdmissionRequest[]>(`${API_URL}/administration/admission-requests`); }
  members() { return this.http.get<SquadMember[]>(`${API_URL}/administration/members`); }
  approve(id: string, operationalGroup: OperationalGroup) {
    return this.http.post<AdmissionRequest>(`${API_URL}/administration/admission-requests/${encodeURIComponent(id)}/approve`, { operationalGroup });
  }
  reject(id: string) { return this.http.post<AdmissionRequest>(`${API_URL}/administration/admission-requests/${encodeURIComponent(id)}/reject`, null); }
  change(id: string, body: MemberChange) {
    return this.http.patch<SquadMember>(`${API_URL}/administration/members/${encodeURIComponent(id)}`, body);
  }
}