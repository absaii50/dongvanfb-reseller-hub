// Centralized error handling utility

export interface AppError {
  code: string;
  message: string;
  details?: string;
  action?: 'relogin' | 'retry' | 'contact_support' | 'add_funds';
}

// Error codes
export const ERROR_CODES = {
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, AppError> = {
  [ERROR_CODES.SESSION_EXPIRED]: {
    code: ERROR_CODES.SESSION_EXPIRED,
    message: 'Your session has expired',
    details: 'Please log in again to continue.',
    action: 'relogin',
  },
  [ERROR_CODES.UNAUTHORIZED]: {
    code: ERROR_CODES.UNAUTHORIZED,
    message: 'Authentication required',
    details: 'You need to be logged in to perform this action.',
    action: 'relogin',
  },
  [ERROR_CODES.INSUFFICIENT_BALANCE]: {
    code: ERROR_CODES.INSUFFICIENT_BALANCE,
    message: 'Insufficient balance',
    details: 'Please add funds to your account.',
    action: 'add_funds',
  },
  [ERROR_CODES.OUT_OF_STOCK]: {
    code: ERROR_CODES.OUT_OF_STOCK,
    message: 'Out of stock',
    details: 'This product is currently unavailable.',
    action: 'retry',
  },
  [ERROR_CODES.API_ERROR]: {
    code: ERROR_CODES.API_ERROR,
    message: 'Service error',
    details: 'Something went wrong. Please try again.',
    action: 'retry',
  },
  [ERROR_CODES.NETWORK_ERROR]: {
    code: ERROR_CODES.NETWORK_ERROR,
    message: 'Connection error',
    details: 'Please check your internet connection and try again.',
    action: 'retry',
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: 'Invalid input',
    details: 'Please check your input and try again.',
    action: 'retry',
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: 'Something went wrong',
    details: 'Please try again or contact support if the issue persists.',
    action: 'retry',
  },
};

// Parse error from various sources (edge function, supabase, etc.)
export function parseError(error: unknown): AppError {
  console.error('[ErrorHandler] Raw error:', JSON.stringify(error, null, 2));

  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
  }

  // Handle string errors
  if (typeof error === 'string') {
    return detectErrorType(error);
  }

  // Handle error objects
  if (typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    
    // Check for Supabase edge function errors
    if ('message' in errorObj) {
      const message = String(errorObj.message);
      return detectErrorType(message, errorObj);
    }

    // Check for context property (Supabase error format)
    if ('context' in errorObj && typeof errorObj.context === 'object') {
      const context = errorObj.context as Record<string, unknown>;
      if ('body' in context) {
        try {
          const body = typeof context.body === 'string' 
            ? JSON.parse(context.body) 
            : context.body;
          if (body?.error) {
            return detectErrorType(String(body.error), body);
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    // Check for error property
    if ('error' in errorObj) {
      return detectErrorType(String(errorObj.error), errorObj);
    }
  }

  return ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

// Detect error type from message
function detectErrorType(message: string, context?: Record<string, unknown>): AppError {
  const lowerMessage = message.toLowerCase();

  // Session/Auth errors
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('session') ||
    lowerMessage.includes('token') ||
    lowerMessage.includes('jwt') ||
    lowerMessage.includes('non-2xx')
  ) {
    return {
      ...ERROR_MESSAGES[ERROR_CODES.SESSION_EXPIRED],
      details: message,
    };
  }

  // Insufficient balance
  if (
    lowerMessage.includes('balance') ||
    lowerMessage.includes('insufficient') ||
    lowerMessage.includes('not enough')
  ) {
    return {
      ...ERROR_MESSAGES[ERROR_CODES.INSUFFICIENT_BALANCE],
      details: message,
    };
  }

  // Out of stock
  if (
    lowerMessage.includes('stock') ||
    lowerMessage.includes('unavailable') ||
    lowerMessage.includes('sold out')
  ) {
    return {
      ...ERROR_MESSAGES[ERROR_CODES.OUT_OF_STOCK],
      details: message,
    };
  }

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    return {
      ...ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
      details: message,
    };
  }

  // Validation errors
  if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('validation')
  ) {
    return {
      ...ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
      details: message,
    };
  }

  // API errors
  if (
    lowerMessage.includes('api') ||
    lowerMessage.includes('server') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('503')
  ) {
    return {
      ...ERROR_MESSAGES[ERROR_CODES.API_ERROR],
      details: message,
    };
  }

  // Default to the original message if we can't categorize it
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: message || 'Something went wrong',
    details: context?.details ? String(context.details) : undefined,
    action: 'retry',
  };
}

// Get error message for display
export function getErrorMessage(error: unknown): string {
  const parsed = parseError(error);
  return parsed.message;
}

// Get full error info for display
export function getErrorInfo(error: unknown): { title: string; description: string } {
  const parsed = parseError(error);
  return {
    title: parsed.message,
    description: parsed.details || 'Please try again.',
  };
}

// Check if error requires re-login
export function isAuthError(error: unknown): boolean {
  const parsed = parseError(error);
  return parsed.action === 'relogin';
}
