import { describe, expect, it, vi } from 'vitest';
import { signAction } from '../src/hmacAuth.js';
import { ControlPlane } from '../src/controlPlane.js';
import { InMemoryNonceStore } from '../src/nonceStore.js';

const SECRET = 'control-plane-secret';

function signed(nonce: string) {
  const type = 'hubspot.createContact' as const;
  const payload = { email: 'replay@example.com' };
  const timestamp = Date.now();
  return { type, payload, timestamp, nonce, signature: signAction(SECRET, type, payload, timestamp, nonce) };
}

describe('replay protection', () => {
  it('executes a captured, validly signed action only once', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'hs-1' }), { status: 201 }));
    const plane = new ControlPlane({ secret: SECRET, hubspot: { accessToken: 't', fetch: fetchMock } });
    const action = signed('n-1');

    expect((await plane.handleInboundAction(action)).success).toBe(true);
    expect(await plane.handleInboundAction(action)).toEqual({ success: false, error: 'replayed nonce' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not burn a nonce on an invalid signature', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'hs-2' }), { status: 201 }));
    const plane = new ControlPlane({ secret: SECRET, hubspot: { accessToken: 't', fetch: fetchMock } });
    const forged = { ...signed('n-2'), signature: '00'.repeat(32) };

    expect((await plane.handleInboundAction(forged)).success).toBe(false);
    expect((await plane.handleInboundAction(signed('n-2'))).success).toBe(true);
  });
});

describe('InMemoryNonceStore', () => {
  it('forgets nonces once their window has passed', () => {
    const store = new InMemoryNonceStore(1_000);
    expect(store.checkAndRemember('a', 0)).toBe(true);
    expect(store.checkAndRemember('a', 999)).toBe(false);
    expect(store.checkAndRemember('a', 1_000)).toBe(true);
  });

  it('stays bounded and fails closed when full', () => {
    const store = new InMemoryNonceStore(60_000, 2);
    expect(store.checkAndRemember('a', 0)).toBe(true);
    expect(store.checkAndRemember('b', 0)).toBe(true);
    expect(store.checkAndRemember('c', 0)).toBe(false);
    expect(store.size).toBe(2);
    expect(store.checkAndRemember('c', 60_000)).toBe(true);
  });
});
