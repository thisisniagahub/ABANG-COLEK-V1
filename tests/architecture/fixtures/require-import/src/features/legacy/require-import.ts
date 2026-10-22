const { assessState } = require('../../../server/platform/assessment');

export function requireProbe(): unknown {
  return assessState;
}
