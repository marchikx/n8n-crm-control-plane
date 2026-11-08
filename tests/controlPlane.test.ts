import { describe, expect, it, vi } from 'vitest';
import type { AuditLogEntry } from '../src/contracts.js';
import { signAction } from '../src/hmacAuth.js';
import { ControlPlane } from '../src/controlPlane.js';

const SECRET = 'control-plane-secret';

function signedAction(
  type: string,
  payload: Record<string, unknown>,
): {
  type: 'hubspot.createContact';
  payload: Record<string, unknown>;
  timestamp: number;
  nonce: string;
  signature: string;
} {
  const timestamp = Date.now();
  const nonce = `nonce-${Math.random().toString(36).slice(2)}`;
  const signature = signAction(SECRET, type, payload, timestamp, nonce);
  return {
    type: type as 'hubspot.createContact',
    payload,
    timestamp,
    nonce,
    signature,
  };
}

describe('ControlPlane audit log', () => {
  it('records success when routing succeeds', async () => {
    const auditLog: AuditLogEntry[] = [];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: 'hs-100' }), { status: 201 }),
    );

    const plane = new ControlPlane({
      secret: SECRET,
      auditLog,
      hubspot: { accessToken: 'token', fetch: fetchMock },
    });

    const action = signedAction('hubspot.createContact', {
      email: 'ok@example.com',
      firstName: 'Ok',
    });

    const outcome = await plane.handleInboundAction(action);

    expect(outcome.success).toBe(true);
    expect(auditLog).toHaveLength(1);
    expect(auditLog[0]?.success).toBe(true);
    expect(auditLog[0]?.actionType).toBe('hubspot.createContact');
    expect(auditLog[0]?.result?.id).toBe('hs-100');
  });

  it('records failure when signature is invalid', async () => {
    const auditLog: AuditLogEntry[] = [];
    const plane = new ControlPlane({
      secret: SECRET,
      auditLog,
      hubspot: { accessToken: 'token' },
    });

    const action = signedAction('hubspot.createContact', { email: 'bad@example.com' });
    action.signature = 'not-a-valid-signature';

    const outcome = await plane.handleInboundAction(action);

    expect(outcome.success).toBe(false);
    expect(auditLog).toHaveLength(1);
    expect(auditLog[0]?.success).toBe(false);
    expect(auditLog[0]?.error).toBe('invalid signature');
  });
});
