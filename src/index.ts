export {
  canonicalActionMessage,
  signAction,
  verifyActionSignature,
} from './hmacAuth.js';

export {
  ACTION_TYPES,
  validateAction,
  type ActionType,
  type AuditLogEntry,
  type InboundAction,
  type NormalizedCrmResult,
  type ValidateActionInput,
  type ValidateActionOptions,
  type ValidateActionResult,
} from './contracts.js';

export {
  HubSpotAdapter,
  type HubSpotAdapterConfig,
  type HubSpotContactInput,
  type HubSpotDealUpdateInput,
  type FetchFn,
} from './adapters/hubspot.js';

export {
  PipedriveAdapter,
  type PipedriveAdapterConfig,
  type PipedrivePersonInput,
  type PipedriveDealUpdateInput,
} from './adapters/pipedrive.js';

export {
  SalesforceAdapter,
  type SalesforceAdapterConfig,
  type SalesforceContactInput,
  type SalesforceDealUpdateInput,
} from './adapters/salesforce.js';

export {
  ControlPlane,
  handleInboundAction,
  type ControlPlaneConfig,
  type HandleInboundResult,
} from './controlPlane.js';
