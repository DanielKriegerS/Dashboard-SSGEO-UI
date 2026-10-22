import { Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';
import { HttpClient } from '@angular/common/http';
import { CoatendSummary } from '../models/coatend/CoatendSummary';
import { from, map, mergeMap, Observable, switchMap, toArray } from 'rxjs';
import { CoatendMoveModel } from '../models/coatend/CoatendMoveModel';
import { CoatendCompleteModel } from '../models/coatend/CoatendCompleteModel';
import { CoatendModel } from '../models/coatend/CoatendModel';
import { CoatendPlannerModel } from '../models/components/planner/CoatendPlannerModel';
import { CoatendMilestoneModel, SwapDateOption } from '../models/coatend/CoatendMilestoneModel';

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

  delete(coatendId: string) : Observable<void>{
    return this.http.delete<void>(`${this.baseUrl}/${coatendId}`);
  }

  getPlannerData(): Observable<CoatendPlannerModel[]> {
    return this.http.get<CoatendPlannerModel[]>(`${API_URL}/planner`);
  }

  getMilestones(id: string): Observable<CoatendMilestoneModel> {
    return this.http.get<CoatendMilestoneModel>(`${this.baseUrl}/${id}/milestones`);
  }

  getSwapDates(): Observable<SwapDateOption[]> {
    return this.getAll().pipe(
      switchMap(coatends => from(coatends).pipe(
        mergeMap(coatend => this.getMilestones(coatend.id).pipe(
          map(milestones => ({ coatend, swap: milestones.swap }))
        ), 6),
        toArray()
      )),
      map(entries => {
        const dates = new Map<string, SwapDateOption>();
        for (const { coatend, swap } of entries) {
          if (!swap.plannedEnd) {
            continue;
          }
          let option = dates.get(swap.plannedEnd);
          if (!option) {
            option = { date: swap.plannedEnd, confirmed: [], pending: [] };
            dates.set(swap.plannedEnd, option);
          }
          (swap.confirmedAt ? option.confirmed : option.pending).push(coatend);
        }
        return [...dates.values()].sort((left, right) => left.date.localeCompare(right.date))
          .map(option => ({
            ...option,
            confirmed: option.confirmed.sort((left, right) => left.coatendNumber - right.coatendNumber),
            pending: option.pending.sort((left, right) => left.coatendNumber - right.coatendNumber)
          }));
      })
    );
  }

  confirmMilestone(id: string, milestone: 'TU' | 'SWAP'): Observable<CoatendMilestoneModel> {
    return this.http.put<CoatendMilestoneModel>(`${this.baseUrl}/${id}/milestones/${milestone}/confirmation`, {});
  }
}