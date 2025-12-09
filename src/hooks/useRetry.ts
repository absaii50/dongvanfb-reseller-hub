import { useState, useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  lastError: unknown | null;
}

export function useRetry(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = baseDelay * Math.pow(backoffMultiplier, attempt);
    return Math.min(delay, maxDelay);
  }, [baseDelay, backoffMultiplier, maxDelay]);

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const executeWithRetry = useCallback(async <T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    shouldRetry?: (error: unknown) => boolean
  ): Promise<T> => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal.aborted) {
        throw new Error('Operation cancelled');
      }

      try {
        setState({ isRetrying: attempt > 0, attempt, lastError: null });
        const result = await fn(signal);
        setState({ isRetrying: false, attempt: 0, lastError: null });
        return result;
      } catch (error) {
        lastError = error;
        setState({ isRetrying: true, attempt, lastError: error });

        console.warn(`[useRetry] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);

        // Check if we should retry
        if (attempt >= maxRetries) {
          break;
        }

        // Check custom retry condition
        if (shouldRetry && !shouldRetry(error)) {
          break;
        }

        // Don't retry auth errors
        if (error instanceof Error && 
            (error.message.includes('401') || 
             error.message.includes('unauthorized') ||
             error.message.includes('session'))) {
          break;
        }

        // Call onRetry callback
        if (onRetry) {
          onRetry(attempt + 1, error);
        }

        // Wait before retrying
        const delay = calculateDelay(attempt);
        console.log(`[useRetry] Waiting ${delay}ms before retry...`);
        await sleep(delay);
      }
    }

    setState({ isRetrying: false, attempt: 0, lastError });
    throw lastError;
  }, [maxRetries, calculateDelay, onRetry]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({ isRetrying: false, attempt: 0, lastError: null });
  }, []);

  const reset = useCallback(() => {
    setState({ isRetrying: false, attempt: 0, lastError: null });
  }, []);

  return {
    ...state,
    executeWithRetry,
    cancel,
    reset,
  };
}

// Standalone utility for non-hook contexts
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[retryWithBackoff] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);

      if (attempt >= maxRetries) {
        break;
      }

      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
