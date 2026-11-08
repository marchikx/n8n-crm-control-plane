import { describe, expect, it } from 'vitest';
import { signAction } from '../src/hmacAuth.js';
import { validateAction } from '../src/contracts.js';

const SECRET = 'contract-test-secret';

describe('validateAction', () => {
  it('rejects unknown action types', () => {
    const timestamp = Date.now();
    const nonce = 'n1';
    const type = 'unknown.doThing';
    const payload = { foo: 'bar' };
    const signature = signAction(SECRET, type, payload, timestamp, nonce);

    const result = validateAction(
      { type, payload, timestamp, nonce, signature },
      { secret: SECRET },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('unknown action type');
    }
  });
});
