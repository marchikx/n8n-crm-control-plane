import { describe, expect, it, vi } from 'vitest';
import { HubSpotAdapter } from '../src/adapters/hubspot.js';

describe('HubSpotAdapter', () => {
  it('createContact sends mapped HubSpot property names', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        properties: Record<string, string>;
      };
      expect(body.properties).toEqual({
        email: 'jane@example.com',
        firstname: 'Jane',
        lastname: 'Doe',
        phone: '555-0100',
        company: 'Acme',
      });
      return new Response(JSON.stringify({ id: 'hs-42' }), { status: 201 });
    });

    const adapter = new HubSpotAdapter({
      accessToken: 'pat-test',
      fetch: fetchMock,
    });

    const result = await adapter.createContact({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '555-0100',
      company: 'Acme',
    });

    expect(result).toEqual({
      provider: 'hubspot',
      operation: 'createContact',
      id: 'hs-42',
      status: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
