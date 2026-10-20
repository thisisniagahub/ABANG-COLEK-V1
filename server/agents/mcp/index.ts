/**
 * AbangColek Sovereign GrowthOS — MCP (barrel)
 *
 * exports awam untuk lapisan MCP pertama-party AbangColek.
 */

export {
  McpAccessError,
  assertOperationalScope,
  canAccessDealer,
  canAccessOrder,
  canAccessOutlet,
  hasOperationalScope,
  scopeOrders,
  toMcpActor,
  type McpActor,
} from './actor';

export {
  LOW_STOCK_THRESHOLD_UNITS,
  OPERATIONS_BRIEF_READ_ONLY_NOTICE,
  computeOperationsBrief,
  type OperationsBriefMetric,
  type OperationsBriefPeriod,
  type OperationsBriefProjection,
  type OperationsBriefResult,
} from './brief';

export {
  MCP_APP_CONTENT_SECURITY_POLICY,
  MCP_APP_HOST_CONTENT_SECURITY_POLICY,
  OPERATIONS_BRIEF_UI_URI,
  buildMcpAppSandboxDocument,
  buildOperationsBriefAppHtml,
} from './appHtml';

export {
  MCP_APP_ALLOWED_METHODS,
  MCP_APP_PROTOCOL_VERSION,
  MCP_APP_SANDBOX_ATTRIBUTE,
  isMcpAppMessage,
  isSandboxResourceReadyParams,
} from './boundary';

export {
  buildAppResourceMeta,
  buildAppToolMeta,
  RESOURCE_MIME_TYPE,
} from './extApps';

export {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  OPERATIONS_BRIEF_DAILY_URI,
  OPERATIONS_BRIEF_URGENT_URI,
  createOperationsMcpServer,
  type McpServerOptions,
} from './server';

export {
  FORBIDDEN_IDENTITY_KEYS,
  MCP_PROTOCOL_VERSION_HEADER,
  MCP_SESSION_HEADER,
  createMcpHttpHandler,
  type McpHttpDependencies,
  type McpSession,
} from './http';

export { createSessionActorResolver } from './session';

export { WebStreamableHttpTransport } from './webTransport';
