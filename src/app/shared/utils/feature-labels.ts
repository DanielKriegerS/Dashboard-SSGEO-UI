import { MilestoneWarning } from '../../models/feature/FeaturePlanningModel';

const reasons: Record<string, string> = {
  MISSING_WEIGHT: 'Peso nao informado', INVALID_WEIGHT: 'Peso invalido',
  INCOMPLETE_FORECAST: 'Previsao incompleta', INVERTED_WINDOW: 'Periodo invertido',
  NO_WORKING_DAYS: 'Periodo sem dias uteis', NO_COATENDS: 'Sem Coatends vinculadas',
  MISSING_TU: 'TU nao planejada', MISSING_SWAP: 'SWAP nao planejado',
  INVALID_SWAP_WINDOW: 'Periodo de SWAP invalido',
  TU_NOT_CONFIRMED: 'TU ainda nao confirmada',
  EFFECTIVE_START_AFTER_PLANNED_END: 'Inicio efetivo posterior ao fim previsto; revisar planejamento'
};

export function featureReason(code: string): string { return reasons[code] || code; }

export function milestoneWarningLabel(warning: MilestoneWarning): string {
  const state = warning.code === 'DUE_TODAY' ? 'prevista para hoje, sem confirmacao'
    : warning.code === 'CONFIRMATION_PENDING' ? 'confirmacao pendente apos o fim previsto'
      : 'previsao incompleta';
  return `${warning.coatendNumber} - ${warning.description}: ${warning.milestone} ${state}`;
}