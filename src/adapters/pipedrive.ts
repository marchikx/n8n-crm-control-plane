import type { NormalizedCrmResult } from '../contracts.js';
import type { FetchFn } from './hubspot.js';

export interface PipedriveAdapterConfig {
  apiToken: string;
  companyDomain: string;
  baseUrl?: string;
  fetch?: FetchFn;
}

export interface PipedrivePersonInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  orgName?: string;
}

export interface PipedriveDealUpdateInput {
  dealId: number | string;
  stageId?: number;
  value?: number;
  title?: string;
}

const defaultFetch: FetchFn = (...args) => globalThis.fetch(...args);

export class PipedriveAdapter {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchFn;

  constructor(config: PipedriveAdapterConfig) {
    this.apiToken = config.apiToken;
    const domain = config.companyDomain.replace(/\.pipedrive\.com$/i, '');
    this.baseUrl = (
      config.baseUrl ?? `https://${domain}.pipedrive.com/api/v1`
    ).replace(/\/$/, '');
    this.fetchImpl = config.fetch ?? defaultFetch;
  }

  mapPersonFields(input: PipedrivePersonInput): Record<string, unknown> {
    const name = [input.firstName, input.lastName].filter(Boolean).join(' ').trim();
    const body: Record<string, unknown> = {
      email: [{ value: input.email, primary: true }],
    };
    if (name) {
      body.name = name;
    }
    if (input.phone) {
      body.phone = [{ value: input.phone, primary: true }];
    }
    if (input.orgName) {
      body.org_id = input.orgName;
    }
    return body;
  }

  async createContact(input: PipedrivePersonInput): Promise<NormalizedCrmResult> {
    const person = this.mapPersonFields(input);
    const url = `${this.baseUrl}/persons?api_token=${encodeURIComponent(this.apiToken)}`;
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Pipedrive createContact failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { data?: { id?: number } };
    const id = data.data?.id;
    if (id === undefined) {
      throw new Error('Pipedrive createContact response missing id');
    }

    return {
      provider: 'pipedrive',
      operation: 'createContact',
      id: String(id),
      status: 'ok',
    };
  }

  async updateDeal(input: PipedriveDealUpdateInput): Promise<NormalizedCrmResult> {
    const dealId = String(input.dealId);
    const body: Record<string, unknown> = {};
    if (input.stageId !== undefined) {
      body.stage_id = input.stageId;
    }
    if (input.value !== undefined) {
      body.value = input.value;
    }
    if (input.title !== undefined) {
      body.title = input.title;
    }

    const url = `${this.baseUrl}/deals/${encodeURIComponent(dealId)}?api_token=${encodeURIComponent(this.apiToken)}`;
    const response = await this.fetchImpl(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pipedrive updateDeal failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { data?: { id?: number } };
    const id = data.data?.id ?? input.dealId;

    return {
      provider: 'pipedrive',
      operation: 'updateDeal',
      id: String(id),
      status: 'ok',
    };
  }
}
