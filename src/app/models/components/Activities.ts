export enum Activity {
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING_TU = 'TESTING_TU',
  PASSAGE_TH = 'PASSAGE_TH',
  HOMOLOGATION = 'HOMOLOGATION',
  ADMINISTRATIVE_TASKS = 'ADMINISTRATIVE_TASKS',
  PRE_SWAP = 'PRE_SWAP',
  SWAP = 'SWAP'
}

export function requiresActivityDeveloper(activity: string): boolean {
  return activity !== Activity.HOMOLOGATION &&
    activity !== Activity.ADMINISTRATIVE_TASKS &&
    activity !== Activity.PRE_SWAP &&
    activity !== Activity.SWAP;
}

export function getActivityFixedExecutor(activity: string): string {
  switch (activity) {
    case Activity.HOMOLOGATION: return 'Homologação';
    case Activity.ADMINISTRATIVE_TASKS: return 'Administrativo';
    case Activity.PRE_SWAP:
    case Activity.SWAP: return 'Equipe Swap';
    default: return 'Executor fixo';
  }
}