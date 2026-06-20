import { CoatendSummary } from "../coatend/CoatendSummary";

export interface SprintCompleteModel {
    id : string,
    description : string,
    coatends : CoatendSummary[],
    startDate : string,
    endDate : string
}