import type { AuditLogEntry, InboundAction, NormalizedCrmResult } from './contracts.js';
import { validateAction } from './contracts.js';
import { HubSpotAdapter, type HubSpotAdapterConfig } from './adapters/hubspot.js';
import { PipedriveAdapter, type PipedriveAdapterConfig } from './adapters/pipedrive.js';
import { SalesforceAdapter, type SalesforceAdapterConfig } from './adapters/salesforce.js';

export interface ControlPlaneConfig {
  secret: string;
  hubspot?: HubSpotAdapterConfig;
  pipedrive?: PipedriveAdapterConfig;
  salesforce?: SalesforceAdapterConfig;
  auditLog?: AuditLogEntry[];
  maxAgeMs?: number;
}

export type HandleInboundResult =
  | { success: true; result: NormalizedCrmResult }
  | { success: false; error: string };

function appendAudit(
  log: AuditLogEntry[] | undefined,
  entry: AuditLogEntry,
): void {
  if (log) {
    log.push(entry);
  }
}

function readString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' ? value : undefined;
}

function readNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export class ControlPlane {
  private readonly secret: string;
  private readonly maxAgeMs?: number;
  private readonly auditLog?: AuditLogEntry[];
  private readonly hubspot?: HubSpotAdapter;
  private readonly pipedrive?: PipedriveAdapter;
  private readonly salesforce?: SalesforceAdapter;

  constructor(config: ControlPlaneConfig) {
    this.secret = config.secret;
    this.maxAgeMs = config.maxAgeMs;
    this.auditLog = config.auditLog;
    if (config.hubspot) {
      this.hubspot = new HubSpotAdapter(config.hubspot);
    }
    if (config.pipedrive) {
      this.pipedrive = new PipedriveAdapter(config.pipedrive);
    }
    if (config.salesforce) {
      this.salesforce = new SalesforceAdapter(config.salesforce);
    }
  }

  getAuditLog(): readonly AuditLogEntry[] {
    return this.auditLog ?? [];
  }

  async handleInboundAction(raw: InboundAction): Promise<HandleInboundResult> {
    const validated = validateAction(raw, {
      secret: this.secret,
      maxAgeMs: this.maxAgeMs,
    });

    if (!validated.ok) {
      appendAudit(this.auditLog, {
        at: new Date().toISOString(),
        actionType: raw.type,
        success: false,
        error: validated.error,
      });
      return { success: false, error: validated.error };
    }

    const action = validated.action;

    try {
      const result = await this.routeAction(action);
      appendAudit(this.auditLog, {
        at: new Date().toISOString(),
        actionType: action.type,
        success: true,
        result,
      });
      return { success: true, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendAudit(this.auditLog, {
        at: new Date().toISOString(),
        actionType: action.type,
        success: false,
        error: message,
      });
      return { success: false, error: message };
    }
  }

  private async routeAction(action: InboundAction): Promise<NormalizedCrmResult> {
    const { type, payload } = action;

    switch (type) {
      case 'hubspot.createContact': {
        if (!this.hubspot) {
          throw new Error('HubSpot adapter is not configured');
        }
        const email = readString(payload, 'email');
        if (!email) {
          throw new Error('payload.email is required');
        }
        return this.hubspot.createContact({
          email,
          firstName: readString(payload, 'firstName'),
          lastName: readString(payload, 'lastName'),
          phone: readString(payload, 'phone'),
          company: readString(payload, 'company'),
        });
      }
      case 'hubspot.updateDeal': {
        if (!this.hubspot) {
          throw new Error('HubSpot adapter is not configured');
        }
        const dealId = readString(payload, 'dealId');
        if (!dealId) {
          throw new Error('payload.dealId is required');
        }
        return this.hubspot.updateDeal({
          dealId,
          stage: readString(payload, 'stage'),
          amount: readNumber(payload, 'amount'),
          name: readString(payload, 'name'),
        });
      }
      case 'pipedrive.createContact': {
        if (!this.pipedrive) {
          throw new Error('Pipedrive adapter is not configured');
        }
        const email = readString(payload, 'email');
        if (!email) {
          throw new Error('payload.email is required');
        }
        return this.pipedrive.createContact({
          email,
          firstName: readString(payload, 'firstName'),
          lastName: readString(payload, 'lastName'),
          phone: readString(payload, 'phone'),
          orgName: readString(payload, 'orgName'),
        });
      }
      case 'pipedrive.updateDeal': {
        if (!this.pipedrive) {
          throw new Error('Pipedrive adapter is not configured');
        }
        const dealId = payload.dealId;
        if (dealId === undefined || dealId === null) {
          throw new Error('payload.dealId is required');
        }
        const stageId = readNumber(payload, 'stageId');
        return this.pipedrive.updateDeal({
          dealId: typeof dealId === 'number' || typeof dealId === 'string' ? dealId : String(dealId),
          stageId,
          value: readNumber(payload, 'value'),
          title: readString(payload, 'title'),
        });
      }
      case 'salesforce.createContact': {
        if (!this.salesforce) {
          throw new Error('Salesforce adapter is not configured');
        }
        const email = readString(payload, 'email');
        if (!email) {
          throw new Error('payload.email is required');
        }
        return this.salesforce.createContact({
          email,
          firstName: readString(payload, 'firstName'),
          lastName: readString(payload, 'lastName'),
          phone: readString(payload, 'phone'),
          company: readString(payload, 'company'),
        });
      }
      case 'salesforce.updateDeal': {
        if (!this.salesforce) {
          throw new Error('Salesforce adapter is not configured');
        }
        const opportunityId = readString(payload, 'opportunityId');
        if (!opportunityId) {
          throw new Error('payload.opportunityId is required');
        }
        return this.salesforce.updateDeal({
          opportunityId,
          stageName: readString(payload, 'stageName'),
          amount: readNumber(payload, 'amount'),
          name: readString(payload, 'name'),
        });
      }
      default: {
        const exhaustive: never = type;
        throw new Error(`unsupported action: ${exhaustive as string}`);
      }
    }
  }
}

export async function handleInboundAction(
  raw: InboundAction,
  config: ControlPlaneConfig,
): Promise<HandleInboundResult> {
  const plane = new ControlPlane(config);
  return plane.handleInboundAction(raw);
}
