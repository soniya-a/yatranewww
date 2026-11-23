/**
 * Centralized Gemini Configuration & Resilience Layer for YATRA
 * Single source of truth for Gemini model designations, retry policies,
 * circuit breaker logic, and error classification.
 */

// Primary verified runtime model (Gemini 3.6 Flash)
// Verified per testing: Gemini 3.8 Flash (503), Gemini 3.7 Flash (503), Gemini 3.6 Flash (working)
export const GEMINI_PRIMARY_MODEL: string = (() => {
  try {
    if (typeof process !== 'undefined' && process.env?.GEMINI_MODEL) {
      return process.env.GEMINI_MODEL;
    }
  } catch (_) {}
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) {
      // @ts-ignore
      return import.meta.env.VITE_GEMINI_MODEL;
    }
  } catch (_) {}
  return 'gemini-3.6-flash';
})();

// Real-time bidirectional live audio model
export const GEMINI_LIVE_AUDIO_MODEL = 'models/gemini-2.5-flash-native-audio-latest';

// Global circuit breaker timestamp
let geminiCircuitBreakerActiveUntil = 0;

/**
 * Checks if error indicates rate limiting, quota exhaustion, or temporary unavailability.
 */
export function checkIsQuotaError(error: any): boolean {
  if (!error) return false;
  try {
    const errorStr = (typeof error === 'object' ? JSON.stringify(error) : String(error)).toLowerCase();
    const messageStr = (error.message || '').toString().toLowerCase();
    const statusStr = (error.status || error.code || error.response?.status || '').toString().toLowerCase();

    return error.status === 429 ||
      error.code === 429 ||
      error.status === 503 ||
      error.code === 503 ||
      statusStr.includes('429') ||
      messageStr.includes('429') ||
      statusStr.includes('503') ||
      messageStr.includes('503') ||
      messageStr.includes('quota') ||
      messageStr.includes('exhausted') ||
      messageStr.includes('demand') ||
      messageStr.includes('unavailable') ||
      messageStr.includes('temporary') ||
      messageStr.includes('rate_limit') ||
      errorStr.includes('429') ||
      errorStr.includes('503') ||
      errorStr.includes('quota') ||
      errorStr.includes('rate_limit') ||
      errorStr.includes('resource_exhausted') ||
      errorStr.includes('exhausted') ||
      errorStr.includes('demand') ||
      errorStr.includes('unavailable') ||
      errorStr.includes('temporary') ||
      errorStr.includes('circuit_breaker_active') ||
      messageStr.includes('circuit_breaker_active');
  } catch (e) {
    return true;
  }
}

/**
 * Identifies permanent errors (400, 401, 403, 404, invalid keys, unsupported models)
 * where retrying would be wasteful and must be stopped immediately.
 */
export function isGeminiPermanentError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error.response?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return true;
  }
  const msg = (error.message || '').toString().toLowerCase();
  const errorStr = (typeof error === 'object' ? JSON.stringify(error) : String(error)).toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('not_found') ||
    msg.includes('404') ||
    msg.includes('is not supported') ||
    msg.includes('invalid argument') ||
    msg.includes('unregistered') ||
    msg.includes('api key not valid') ||
    msg.includes('invalid key') ||
    msg.includes('api_key_invalid') ||
    errorStr.includes('not_found') ||
    errorStr.includes('404') ||
    errorStr.includes('api_key_invalid')
  );
}

/**
 * Identifies temporary errors (503 Service Unavailable, 429 Rate Limit, 500/502/504)
 * eligible for limited exponential backoff retry.
 */
export function isGeminiTransientError(error: any): boolean {
  if (!error) return false;
  if (isGeminiPermanentError(error)) return false;

  const status = error.status || error.code || error.response?.status;
  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
    return true;
  }
  return checkIsQuotaError(error);
}

/**
 * Circuit breaker controls to prevent hammering Gemini when hard rate-limited.
 */
export function isGeminiCircuitBreakerActive(): boolean {
  return Date.now() < geminiCircuitBreakerActiveUntil;
}

export function getCircuitBreakerCooldownRemaining(): number {
  return Math.max(0, Math.ceil((geminiCircuitBreakerActiveUntil - Date.now()) / 1000));
}

export function tripGeminiCircuitBreaker(cooldownSeconds: number = 15): void {
  const boundedSeconds = Math.min(Math.max(cooldownSeconds, 5), 30);
  geminiCircuitBreakerActiveUntil = Date.now() + (boundedSeconds * 1000);
}

export function resetGeminiCircuitBreaker(): void {
  geminiCircuitBreakerActiveUntil = 0;
}

export interface GeminiRetryOptions {
  maxRetries?: number;      // default: 2 (total 3 attempts)
  initialDelayMs?: number;  // default: 1000ms
  backoffFactor?: number;   // default: 2
  jitter?: boolean;         // default: true
  timeoutMs?: number;       // optional per-attempt or overall timeout
  operationName?: string;   // identifier for logging
}

/**
 * Executes a Gemini operation with limited exponential backoff for temporary 503 and 429 errors.
 * Immediately fails fast on 404 or permanent errors without retrying unavailable models.
 */
export async function executeGeminiWithRetry<T>(
  fn: () => Promise<T>,
  options: GeminiRetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelay = options.initialDelayMs ?? 1000;
  const backoffFactor = options.backoffFactor ?? 2;
  const useJitter = options.jitter ?? true;
  const op = options.operationName || 'GeminiCall';

  // Fast check: is circuit breaker active?
  if (isGeminiCircuitBreakerActive()) {
    const timeLeft = getCircuitBreakerCooldownRemaining();
    console.info(`[${op}] Gemini circuit breaker is active (${timeLeft}s remaining). Engaging fast fallback.`);
    throw new Error('CIRCUIT_BREAKER_ACTIVE: Gemini is rate-limited.');
  }

  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      if (options.timeoutMs && options.timeoutMs > 0) {
        let timer: any;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`GEMINI_TIMEOUT: Operation exceeded ${options.timeoutMs}ms`)), options.timeoutMs);
        });
        try {
          const result = await Promise.race([fn(), timeoutPromise]);
          clearTimeout(timer);
          return result;
        } catch (raceErr) {
          clearTimeout(timer);
          throw raceErr;
        }
      } else {
        return await fn();
      }
    } catch (error: any) {
      attempt++;

      // 1. Fail immediately on permanent errors (404, invalid model, bad request, auth)
      // DO NOT repeatedly retry unavailable models!
      if (isGeminiPermanentError(error)) {
        console.warn(`[${op}] Permanent error encountered (${error?.status || error?.message || 'unknown'}). Failing fast without retry.`);
        throw error;
      }

      // 2. Check if transient (503, 429, temporary network)
      const isTransient = isGeminiTransientError(error);

      // If hard 429 or quota exhaustion, trip the circuit breaker
      const msg = (error?.message || '').toLowerCase();
      const status = error?.status || error?.code || error?.response?.status;
      if (status === 429 || msg.includes('quota') || msg.includes('resource_exhausted')) {
        const retryAfterHeader = error?.response?.headers?.get?.('retry-after') || error?.headers?.['retry-after'];
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 15;
        tripGeminiCircuitBreaker(isNaN(retryAfterSec) ? 15 : retryAfterSec);
      }

      if (!isTransient || attempt > maxRetries) {
        if (!isTransient) {
          console.warn(`[${op}] Non-transient error (${error?.message || error}). Halting retries.`);
        } else {
          console.warn(`[${op}] Max retries (${maxRetries}) exhausted for temporary error. Re-throwing for deterministic fallback.`);
        }
        throw error;
      }

      // 3. Retry with exponential backoff and jitter
      const jitterMs = useJitter ? Math.floor(Math.random() * (delay * 0.3)) : 0;
      const sleepTime = delay + jitterMs;
      console.info(`[${op}] Transient ${status || '503/429'} error. Retrying attempt ${attempt}/${maxRetries} in ${sleepTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
      delay *= backoffFactor;
    }
  }
}
