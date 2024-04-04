/**
 * Token Bucket that refreshes total capacity in a fixed 1 minute window.
 * The bucket is used to rate limit requests to the Okta API.
 */
export class TokenBucket {
  private capacity: number;
  private tokens: number;
  private lastReplenish: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastReplenish = Date.now();
  }

  private replenish(): void {
    const now = Date.now();
    // Check if more than 1 minute has passed since last replenishment
    if (now - this.lastReplenish >= 60000) {
      this.tokens = this.capacity;
      this.lastReplenish = now;
    }
  }

  public take(): number {
    this.replenish();

    if (this.tokens > 0) {
      this.tokens -= 1;
      return 0;
    } else {
      const now = Date.now();
      const waitTime = 60000 - (now - this.lastReplenish);
      return waitTime;
    }
  }

  public currentTokens(): number {
    return this.tokens;
  }

  public restart(): void {
    this.tokens = this.capacity;
    this.lastReplenish = Date.now();
  }
}
