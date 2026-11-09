import { describe, expect, it, vi } from 'vitest';
import { HubSpotAdapter } from '../src/adapters/hubspot.js';
import { PipedriveAdapter } from '../src/adapters/pipedrive.js';
import { SalesforceAdapter } from '../src/adapters/salesforce.js';

describe('CRM adapter failure paths', () => {
  it('HubSpot createContact throws on 401', async () => {
    const fetchMock = vi.fn(async () => new Response('unauthorized', { status: 401 }));
    const adapter = new HubSpotAdapter({ accessToken: 'bad', fetch: fetchMock });
    await expect(
      adapter.createContact({ email: 'a@b.com', firstName: 'A' }),
    ).rejects.toThrow(/401/);
  });

  it('HubSpot createContact throws on 429', async () => {
    const fetchMock = vi.fn(async () => new Response('rate limited', { status: 429 }));
    const adapter = new HubSpotAdapter({ accessToken: 'tok', fetch: fetchMock });
    await expect(
      adapter.createContact({ email: 'a@b.com' }),
    ).rejects.toThrow(/429/);
  });

  it('Pipedrive createContact throws on 401', async () => {
    const fetchMock = vi.fn(async () => new Response('bad token', { status: 401 }));
    const adapter = new PipedriveAdapter({
      apiToken: 'bad',
      companyDomain: 'acme',
      fetch: fetchMock,
    });
    await expect(
      adapter.createContact({ email: 'a@b.com', firstName: 'A' }),
    ).rejects.toThrow(/401/);
  });

  it('Pipedrive createContact throws on 429', async () => {
    const fetchMock = vi.fn(async () => new Response('slow down', { status: 429 }));
    const adapter = new PipedriveAdapter({
      apiToken: 'tok',
      companyDomain: 'acme',
      fetch: fetchMock,
    });
    await expect(adapter.createContact({ email: 'a@b.com' })).rejects.toThrow(/429/);
  });

  it('Salesforce createContact throws on 401', async () => {
    const fetchMock = vi.fn(async () => new Response('invalid_session', { status: 401 }));
    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://example.my.salesforce.com',
      accessToken: 'bad',
      fetch: fetchMock,
    });
    await expect(
      adapter.createContact({ email: 'a@b.com', lastName: 'Z' }),
    ).rejects.toThrow(/401/);
  });

  it('Salesforce createContact throws on 429', async () => {
    const fetchMock = vi.fn(async () => new Response('REQUEST_LIMIT_EXCEEDED', { status: 429 }));
    const adapter = new SalesforceAdapter({
      instanceUrl: 'https://example.my.salesforce.com',
      accessToken: 'tok',
      fetch: fetchMock,
    });
    await expect(
      adapter.createContact({ email: 'a@b.com', lastName: 'Z' }),
    ).rejects.toThrow(/429/);
  });
});

