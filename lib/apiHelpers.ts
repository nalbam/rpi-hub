import { NextResponse } from 'next/server';

/**
 * Creates a standardized error response
 * @param message - Error message to return to client
 * @param error - Optional error object for logging
 * @param status - HTTP status code (default: 500)
 * @returns NextResponse with error JSON
 */
export function createErrorResponse(
  message: string,
  error?: unknown,
  status: number = 500
): NextResponse {
  if (error) {
    console.error(message, error);
  }
  return NextResponse.json({ error: message }, { status });
}

/**
 * Creates a validation error response (400)
 * @param error - Validation error message
 * @returns NextResponse with 400 status
 */
export function createValidationError(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Creates a success response with data
 * @param data - Data to return to client
 * @returns NextResponse with JSON data
 */
export function createSuccessResponse<T>(data: T): NextResponse {
  return NextResponse.json(data);
}

/**
 * Handles validation result and returns error response if invalid
 * @param validation - Validation result object
 * @returns NextResponse if invalid, null if valid
 */
export function handleValidation(validation: {
  valid: boolean;
  error?: string;
}): NextResponse | null {
  if (!validation.valid) {
    return createValidationError(
      validation.error || 'Validation failed'
    );
  }
  return null;
}

/**
 * Extracts and validates required query parameter
 * @param searchParams - URLSearchParams object
 * @param paramName - Name of the parameter
 * @returns Value if present, NextResponse error if missing
 */
export function getRequiredParam(
  searchParams: URLSearchParams,
  paramName: string
): string | NextResponse {
  const value = searchParams.get(paramName);
  if (value === null) {
    return createValidationError(`Missing ${paramName} parameter`);
  }
  return value;
}

/**
 * Type guard to check if value is NextResponse (error)
 * @param value - Value to check
 * @returns True if value is NextResponse
 */
export function isErrorResponse(value: unknown): value is NextResponse {
  // Check if value is an object with NextResponse-like properties
  // This works both in production and in tests with mocked NextResponse
  if (value === null || typeof value !== 'object') {
    return false;
  }

  // Check for mocked NextResponse first (for tests)
  if ('_type' in value && (value as { _type: string })._type === 'NextResponse') {
    return true;
  }

  // Check for real NextResponse instance (for production)
  // Use try-catch to handle cases where NextResponse might not be a constructor
  try {
    return value instanceof NextResponse;
  } catch {
    return false;
  }
}
