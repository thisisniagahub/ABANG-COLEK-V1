import { assessState } from '../../../../server/platform/assessment';

export function deepAssessment(): unknown {
  return assessState({});
}
