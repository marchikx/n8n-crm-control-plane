import { verifyActionSignature } from './hmacAuth.js';

export const ACTION_TYPES = [
  'hubspot.createContact',
  'hubspot.updateDeal',
  'pipedrive.createContact',
  'pipedrive.updateDeal',
  'salesforce.createContact',
  'salesforce.updateDeal',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export interface InboundAction {
  type: ActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  nonce: string;
  signature: string;
}

export type ValidateActionInput = {
  type: string;
  payload: unknown;
  timestamp: number;
  nonce: string;
  signature: string;
};

export type ValidateActionOptions = {
  secret?: string;
  /** Reject actions older than this many milliseconds (default: 5 minutes). */
  maxAgeMs?: number;
  /** Skew allowance for clocks ahead of server (default: 60 seconds). */
  maxFutureSkewMs?: number;
};

export type ValidateActionResult =
  | { ok: true; action: InboundAction }
  | { ok: false; error: string };

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
const DEFAULT_MAX_FUTURE_SKEW_MS = 60 * 1000;

function isActionType(value: string): value is ActionType {
  return (ACTION_TYPES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateAction(
  input: ValidateActionInput,
  options: ValidateActionOptions = {},
): ValidateActionResult {
  const { type, payload, timestamp, nonce, signature } = input;

  if (typeof type !== 'string' || type.trim() === '') {
    return { ok: false, error: 'type must be a non-empty string' };
  }

  if (!isActionType(type)) {
    return { ok: false, error: `unknown action type: ${type}` };
  }

  if (!isRecord(payload)) {
    return { ok: false, error: 'payload must be a plain object' };
  }

  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return { ok: false, error: 'timestamp must be a finite number' };
  }

  if (typeof nonce !== 'string' || nonce.trim() === '') {
    return { ok: false, error: 'nonce must be a non-empty string' };
  }

  if (typeof signature !== 'string' || signature.trim() === '') {
    return { ok: false, error: 'signature must be a non-empty string' };
  }

  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const maxFutureSkewMs = options.maxFutureSkewMs ?? DEFAULT_MAX_FUTURE_SKEW_MS;
  const now = Date.now();

  if (timestamp < now - maxAgeMs) {
    return { ok: false, error: 'timestamp is too old' };
  }

  if (timestamp > now + maxFutureSkewMs) {
    return { ok: false, error: 'timestamp is in the future' };
  }

  if (options.secret) {
    const valid = verifyActionSignature(
      options.secret,
      type,
      payload,
      timestamp,
      nonce,
      signature,
    );
    if (!valid) {
      return { ok: false, error: 'invalid signature' };
    }
  }

  return {
    ok: true,
    action: { type, payload, timestamp, nonce, signature },
  };
}

export interface NormalizedCrmResult {
  provider: 'hubspot' | 'pipedrive' | 'salesforce';
  operation: string;
  id: string;
  status: 'ok';
}

export interface AuditLogEntry {
  at: string;
  actionType: string;
  success: boolean;
  error?: string;
  result?: NormalizedCrmResult;
}
