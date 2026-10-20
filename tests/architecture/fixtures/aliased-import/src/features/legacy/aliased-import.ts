import { assessState } from '@server/platform/assessment';

export function aliasedAssessment(): unknown {
  return assessState({});
}
