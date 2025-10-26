/**
 * In-Memory Rate Limit Store
 *
 * Simple in-memory storage for rate limiting.
 * For production with multiple instances, replace with Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryRateLimitStore {
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.store = new Map();

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Increment the counter for a key
   * @returns The current count and reset time
   */
  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    // If entry exists and hasn't expired, increment it
    if (existing && existing.resetAt > now) {
      existing.count++;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    // Create new entry
    const resetAt = now + windowMs;
    const entry: RateLimitEntry = { count: 1, resetAt };
    this.store.set(key, entry);

    return { count: 1, resetAt };
  }

  /**
   * Get the current count for a key
   */
  get(key: string): { count: number; resetAt: number } | null {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.resetAt <= now) {
      return null;
    }

    return { count: existing.count, resetAt: existing.resetAt };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[RateLimit] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Reset a specific key (useful for testing)
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all entries (useful for testing)
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Get current store size
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Singleton instance
export const rateLimitStore = new InMemoryRateLimitStore();

// Cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => rateLimitStore.destroy());
  process.on('SIGINT', () => rateLimitStore.destroy());
}
