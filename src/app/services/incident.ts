import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, from, map, mergeMap, of, switchMap, toArray } from 'rxjs';
import { API_URL } from '../config/api.config';
import { SwapDateOption } from '../models/coatend/CoatendMilestoneModel';
import {
  IncidentActivityRequest, IncidentBlock, IncidentBlockRequest, IncidentMilestones,
  IncidentModel, IncidentPlanningData, IncidentRequest, IncidentTimeline
} from '../models/incident/IncidentModel';

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL}/incidents`;
  private itemUrl(id: string) { return `${this.base}/${encodeURIComponent(id)}`; }

  getAll() { return this.http.get<IncidentModel[]>(this.base); }
  getById(id: string) { return this.http.get<IncidentModel>(this.itemUrl(id)); }
  create(request: IncidentRequest) { return this.http.post<IncidentModel>(this.base, request); }
  update(id: string, request: IncidentRequest) { return this.http.put<IncidentModel>(this.itemUrl(id), request); }
  delete(id: string) { return this.http.delete<void>(this.itemUrl(id)); }
  getTimeline(id: string) { return this.http.get<IncidentTimeline[]>(`${this.itemUrl(id)}/timeline`); }
  createActivity(id: string, request: IncidentActivityRequest) {
    return this.http.post<IncidentTimeline>(`${this.itemUrl(id)}/timeline`, request);
  }
  createBatch(id: string, requests: IncidentActivityRequest[]) {
    return this.http.post<IncidentTimeline[]>(`${this.itemUrl(id)}/timeline/batch`, requests);
  }
  updateActivity(id: string, activityId: string, request: IncidentActivityRequest) {
    return this.http.put<IncidentTimeline>(`${this.itemUrl(id)}/timeline/${encodeURIComponent(activityId)}`, request);
  }
  updatePeriods(id: string, activityId: string, requests: IncidentActivityRequest[]) {
    return this.http.put<IncidentTimeline[]>(`${this.itemUrl(id)}/timeline/${encodeURIComponent(activityId)}/periods`, requests);
  }
  deleteActivity(id: string, activityId: string) {
    return this.http.delete<void>(`${this.itemUrl(id)}/timeline/${encodeURIComponent(activityId)}`);
  }
  getMilestones(id: string) { return this.http.get<IncidentMilestones>(`${this.itemUrl(id)}/milestones`); }
  confirmMilestone(id: string, milestone: 'TU' | 'SWAP') {
    return this.http.put<IncidentMilestones>(`${this.itemUrl(id)}/milestones/${milestone}/confirmation`, {});
  }
  reopenMilestone(id: string, milestone: 'TU' | 'SWAP') {
    return this.http.delete<IncidentMilestones>(`${this.itemUrl(id)}/milestones/${milestone}/confirmation`);
  }
  getBlocks(id: string) { return this.http.get<IncidentBlock[]>(`${this.itemUrl(id)}/blocks`); }
  createBlock(id: string, request: IncidentBlockRequest) {
    return this.http.post<IncidentBlock>(`${this.itemUrl(id)}/blocks`, request);
  }
  updateBlock(id: string, blockId: string, request: IncidentBlockRequest) {
    return this.http.put<IncidentBlock>(`${this.itemUrl(id)}/blocks/${encodeURIComponent(blockId)}`, request);
  }

  getSwapDates() {
    return this.getAll().pipe(
      switchMap(incidents => from(incidents).pipe(
        mergeMap(incident => this.getMilestones(incident.id).pipe(map(milestones => ({ incident, swap: milestones.swap }))), 6),
        toArray()
      )),
      map(entries => {
        const dates = new Map<string, SwapDateOption>();
        for (const { incident, swap } of entries) {
          if (!swap.plannedEnd) continue;
          let option = dates.get(swap.plannedEnd);
          if (!option) {
            option = { date: swap.plannedEnd, confirmed: [], pending: [], confirmedIncidents: [], pendingIncidents: [] };
            dates.set(swap.plannedEnd, option);
          }
          (swap.confirmedAt ? option.confirmedIncidents! : option.pendingIncidents!).push(incident);
        }
        return [...dates.values()].sort((left, right) => left.date.localeCompare(right.date)).map(option => ({ ...option,
          confirmedIncidents: option.confirmedIncidents!.sort((left, right) => left.code.localeCompare(right.code)),
          pendingIncidents: option.pendingIncidents!.sort((left, right) => left.code.localeCompare(right.code))
        }));
      })
    );
  }

  getPlanningData() {
    return this.getAll().pipe(switchMap(incidents => from(incidents).pipe(
      mergeMap((incident, index) => forkJoin({
        timeline: this.getTimeline(incident.id), milestones: this.getMilestones(incident.id), blocks: this.getBlocks(incident.id)
      }).pipe(
        map(data => ({ index, data: { incident, ...data } as IncidentPlanningData })),
        catchError(() => of({ index, data: {
          incident, timeline: [], milestones: null, blocks: [], error: 'Nao foi possivel carregar o planejamento deste Incidente.'
        } as IncidentPlanningData }))
      ), 4),
      toArray(),
      map(entries => entries.sort((left, right) => left.index - right.index).map(entry => entry.data))
    )));
  }
}