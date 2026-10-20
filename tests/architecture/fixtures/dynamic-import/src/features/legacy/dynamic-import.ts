export async function loadAssessment(): Promise<unknown> {
  const assessment = await import('../../../server/platform/assessment');
  return assessment.assessState({});
}
