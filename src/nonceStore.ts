/**
 * Remembers nonces for as long as their timestamp could still pass the age check.
 * Anything older is already rejected by `validateAction`, so it can be forgotten.
 */
export interface NonceStore {
  /** Returns false if the nonce was already seen inside its window. */
  checkAndRemember(nonce: string, now: number): boolean | Promise<boolean>;
}

export class InMemoryNonceStore implements NonceStore {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 10_000,
  ) {}

  checkAndRemember(nonce: string, now: number): boolean {
    this.evictExpired(now);
    const expiresAt = this.seen.get(nonce);
    if (expiresAt !== undefined && expiresAt > now) {
      return false;
    }
    if (this.seen.size >= this.maxEntries) {
      // Fail closed: under a nonce flood we refuse new actions rather than forget old nonces.
      return false;
    }
    this.seen.set(nonce, now + this.ttlMs);
    return true;
  }

  get size(): number {
    return this.seen.size;
  }

  private evictExpired(now: number): void {
    for (const [nonce, expiresAt] of this.seen) {
      if (expiresAt <= now) {
        this.seen.delete(nonce);
      }
    }
  }
}
