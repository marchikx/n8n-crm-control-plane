import { createHmac, timingSafeEqual } from 'node:crypto';

export function canonicalActionMessage(
  type: string,
  payload: unknown,
  timestamp: number,
  nonce: string,
): string {
  const stablePayload = payload === undefined ? null : payload;
  return JSON.stringify({
    type,
    payload: stablePayload,
    timestamp,
    nonce,
  });
}

export function signAction(
  secret: string,
  type: string,
  payload: unknown,
  timestamp: number,
  nonce: string,
): string {
  const message = canonicalActionMessage(type, payload, timestamp, nonce);
  return createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

export function verifyActionSignature(
  secret: string,
  type: string,
  payload: unknown,
  timestamp: number,
  nonce: string,
  signature: string,
): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }
  const expected = signAction(secret, type, payload, timestamp, nonce);
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const providedBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
