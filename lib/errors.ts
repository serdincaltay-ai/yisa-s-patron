/**
 * YİSA-S Error Handling
 * Global error types ve error wrapper'lar
 */

/**
 * Custom error types
 */
export class YisaError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "YisaError"
  }
}

export class ValidationError extends YisaError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details)
    this.name = "ValidationError"
  }
}

export class AuthenticationError extends YisaError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR")
    this.name = "AuthenticationError"
  }
}

export class AuthorizationError extends YisaError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR")
    this.name = "AuthorizationError"
  }
}

export class NotFoundError extends YisaError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND")
    this.name = "NotFoundError"
  }
}

export class RateLimitError extends YisaError {
  constructor(message: string = "Rate limit exceeded") {
    super(message, 429, "RATE_LIMIT_EXCEEDED")
    this.name = "RateLimitError"
  }
}

/**
 * API error response formatı
 */
export interface ApiErrorResponse {
  error: {
    message: string
    code?: string
    statusCode: number
    details?: unknown
  }
}

/**
 * API route'larda kullanılacak error handler
 */
export function handleApiError(error: unknown): Response {
  // YisaError ise direkt döndür
  if (error instanceof YisaError) {
    return Response.json(
      {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.details,
        },
      } as ApiErrorResponse,
      { status: error.statusCode }
    )
  }

  // Error instance ise
  if (error instanceof Error) {
    // Production'da detaylı hata gösterme
    const isDevelopment = process.env.NODE_ENV === "development"

    return Response.json(
      {
        error: {
          message: isDevelopment ? error.message : "Internal server error",
          code: "INTERNAL_ERROR",
          statusCode: 500,
          details: isDevelopment ? { stack: error.stack } : undefined,
        },
      } as ApiErrorResponse,
      { status: 500 }
    )
  }

  // Bilinmeyen hata
  return Response.json(
    {
      error: {
        message: "An unexpected error occurred",
        code: "UNKNOWN_ERROR",
        statusCode: 500,
      },
    } as ApiErrorResponse,
    { status: 500 }
  )
}

/**
 * Try-catch wrapper for API routes
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>
): Promise<Response> {
  try {
    const result = await handler()
    // Handler zaten Response döndüyse tekrar sarmalama
    if (result instanceof Response) return result
    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
