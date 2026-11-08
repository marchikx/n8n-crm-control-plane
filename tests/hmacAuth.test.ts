import { describe, expect, it } from 'vitest';
import { signAction, verifyActionSignature } from '../src/hmacAuth.js';

const SECRET = 'test-webhook-secret';

describe('HMAC auth', () => {
  it('accepts a valid signature', () => {
    const type = 'hubspot.createContact';
    const payload = { email: 'alex@example.com', firstName: 'Alex' };
    const timestamp = Date.now();
    const nonce = 'nonce-valid-1';
    const signature = signAction(SECRET, type, payload, timestamp, nonce);

    expect(
      verifyActionSignature(SECRET, type, payload, timestamp, nonce, signature),
    ).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const type = 'hubspot.createContact';
    const payload = { email: 'alex@example.com' };
    const timestamp = Date.now();
    const nonce = 'nonce-invalid-1';

    expect(
      verifyActionSignature(SECRET, type, payload, timestamp, nonce, 'deadbeef'),
    ).toBe(false);
  });
});
