import type { NormalizedCrmResult } from '../contracts.js';
import type { FetchFn } from './hubspot.js';

export interface SalesforceAdapterConfig {
  instanceUrl: string;
  accessToken: string;
  apiVersion?: string;
  fetch?: FetchFn;
}

export interface SalesforceContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

export interface SalesforceDealUpdateInput {
  opportunityId: string;
  stageName?: string;
  amount?: number;
  name?: string;
}

const defaultFetch: FetchFn = (...args) => globalThis.fetch(...args);

export class SalesforceAdapter {
  private readonly instanceUrl: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly fetchImpl: FetchFn;

  constructor(config: SalesforceAdapterConfig) {
    this.instanceUrl = config.instanceUrl.replace(/\/$/, '');
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion ?? 'v59.0';
    this.fetchImpl = config.fetch ?? defaultFetch;
  }

  mapContactFields(input: SalesforceContactInput): Record<string, string> {
    const fields: Record<string, string> = {
      Email: input.email,
      LastName: input.lastName ?? input.email.split('@')[0] ?? 'Contact',
    };
    if (input.firstName !== undefined) {
      fields.FirstName = input.firstName;
    }
    if (input.phone !== undefined) {
      fields.Phone = input.phone;
    }
    if (input.company !== undefined) {
      fields.Company = input.company;
    }
    return fields;
  }

  async createContact(input: SalesforceContactInput): Promise<NormalizedCrmResult> {
    const fields = this.mapContactFields(input);
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Contact`;
    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Salesforce createContact failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { id?: string; success?: boolean };
    const id = data.id ?? '';
    if (!id) {
      throw new Error('Salesforce createContact response missing id');
    }

    return {
      provider: 'salesforce',
      operation: 'createContact',
      id,
      status: 'ok',
    };
  }

  async updateDeal(input: SalesforceDealUpdateInput): Promise<NormalizedCrmResult> {
    const patch: Record<string, unknown> = {};
    if (input.stageName !== undefined) {
      patch.StageName = input.stageName;
    }
    if (input.amount !== undefined) {
      patch.Amount = input.amount;
    }
    if (input.name !== undefined) {
      patch.Name = input.name;
    }

    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/Opportunity/${encodeURIComponent(input.opportunityId)}`;
    const response = await this.fetchImpl(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Salesforce updateDeal failed (${response.status}): ${body}`);
    }

    return {
      provider: 'salesforce',
      operation: 'updateDeal',
      id: input.opportunityId,
      status: 'ok',
    };
  }
}
