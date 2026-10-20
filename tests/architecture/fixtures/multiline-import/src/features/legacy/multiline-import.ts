import {
  assessState,
  compactState,
} from '../../../server/platform/assessment';

export function assessment(): unknown {
  return assessState(compactState);
}
