import type { NormalizedCrmResult } from '../contracts.js';

export type FetchFn = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface HubSpotAdapterConfig {
  accessToken: string;
  baseUrl?: string;
  fetch?: FetchFn;
}

export interface HubSpotContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export interface HubSpotDealUpdateInput {
  dealId: string;
  stage?: string;
  amount?: number;
  name?: string;
}

const defaultFetch: FetchFn = (...args) => globalThis.fetch(...args);

export class HubSpotAdapter {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchFn;

  constructor(config: HubSpotAdapterConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.hubapi.com').replace(/\/$/, '');
    this.fetchImpl = config.fetch ?? defaultFetch;
  }

  mapContactFields(input: HubSpotContactInput): Record<string, string> {
    const properties: Record<string, string> = { email: input.email };
    if (input.firstName !== undefined) {
      properties.firstname = input.firstName;
    }
    if (input.lastName !== undefined) {
      properties.lastname = input.lastName;
    }
    if (input.phone !== undefined) {
      properties.phone = input.phone;
    }
    if (input.company !== undefined) {
      properties.company = input.company;
    }
    return properties;
  }

  async createContact(input: HubSpotContactInput): Promise<NormalizedCrmResult> {
    const properties = this.mapContactFields(input);
    const url = `${this.baseUrl}/crm/v3/objects/contacts`;
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HubSpot createContact failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { id?: string };
    const id = data.id ?? '';
    if (!id) {
      throw new Error('HubSpot createContact response missing id');
    }

    return {
      provider: 'hubspot',
      operation: 'createContact',
      id,
      status: 'ok',
    };
  }

  async updateDeal(input: HubSpotDealUpdateInput): Promise<NormalizedCrmResult> {
    const properties: Record<string, string> = {};
    if (input.stage !== undefined) {
      properties.dealstage = input.stage;
    }
    if (input.amount !== undefined) {
      properties.amount = String(input.amount);
    }
    if (input.name !== undefined) {
      properties.dealname = input.name;
    }

    const url = `${this.baseUrl}/crm/v3/objects/deals/${encodeURIComponent(input.dealId)}`;
    const response = await this.fetchImpl(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HubSpot updateDeal failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { id?: string };
    const id = data.id ?? input.dealId;

    return {
      provider: 'hubspot',
      operation: 'updateDeal',
      id,
      status: 'ok',
    };
  }
}
