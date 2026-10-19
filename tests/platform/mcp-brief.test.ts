import { describe, expect, test } from 'bun:test';
import { operationsBriefApp } from '../../server/platform/mcp/operationsBrief';
import { validateA2UIComponent } from '../../shared/copilot-contracts';

describe('Operations Brief First-Party Read-Only MCP App', () => {
  test('Daily brief returns structured metrics with readOnly guarantee', () => {
    const { data, a2ui } = operationsBriefApp.getDailyBrief();
    
    expect(data.period).toBe('daily');
    expect(data.readOnly).toBe(true);
    expect(data.metrics.totalOrdersToday).toBeGreaterThan(0);
    expect(data.metrics.grossSalesSen).toBeGreaterThan(0);
    expect(Number.isInteger(data.metrics.grossSalesSen)).toBe(true);
    
    expect(a2ui.schemaVersion).toBe('a2ui.v1');
    expect(a2ui.component).toBe('OperationsBriefCard');
    expect(validateA2UIComponent(a2ui.component)).toBe(true);
    expect(a2ui.props.status).toBe('OPERATIONAL_NORMAL');
  });

  test('Urgent brief returns structured alerts with HITL action guidance', () => {
    const { data, a2ui } = operationsBriefApp.getUrgentBrief();
    
    expect(data.period).toBe('urgent');
    expect(data.readOnly).toBe(true);
    expect(data.metrics.pendingHitlApprovals).toBe(1);
    
    expect(a2ui.schemaVersion).toBe('a2ui.v1');
    expect(a2ui.component).toBe('OperationsBriefCard');
    expect(a2ui.props.status).toBe('ATTENTION_REQUIRED');
    expect(a2ui.actions).toBeDefined();
    expect(a2ui.actions!.length).toBeGreaterThan(0);
    expect(a2ui.actions![0].actionType).toBe('navigate');
  });

  test('resolveResource correctly serves operations://brief/daily and operations://brief/urgent', () => {
    const dailyRes = operationsBriefApp.resolveResource('operations://brief/daily');
    expect(dailyRes.contents.length).toBe(1);
    expect(dailyRes.contents[0].uri).toBe('operations://brief/daily');
    expect(dailyRes.contents[0].mimeType).toBe('application/json');
    const parsedDaily = JSON.parse(dailyRes.contents[0].text);
    expect(parsedDaily.period).toBe('daily');

    const urgentRes = operationsBriefApp.resolveResource('operations://brief/urgent');
    expect(urgentRes.contents.length).toBe(1);
    expect(urgentRes.contents[0].uri).toBe('operations://brief/urgent');
    const parsedUrgent = JSON.parse(urgentRes.contents[0].text);
    expect(parsedUrgent.period).toBe('urgent');
  });

  test('resolveResource throws on unknown URI', () => {
    expect(() => operationsBriefApp.resolveResource('operations://unknown/resource')).toThrow(
      /MCP Resource/
    );
  });
});
