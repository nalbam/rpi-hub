import { NextResponse } from 'next/server';
import {
  createErrorResponse,
  createValidationError,
  createSuccessResponse,
  handleValidation,
  getRequiredParam,
  isErrorResponse,
} from '../apiHelpers';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => {
      return {
        _data: data,
        _status: init?.status || 200,
        _type: 'NextResponse',
      };
    }),
  },
}));

describe('apiHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('createErrorResponse', () => {
    it('should create error response with default status 500', () => {
      const response = createErrorResponse('Test error');

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Test error' },
        { status: 500 }
      );
      expect(response).toMatchObject({
        _data: { error: 'Test error' },
        _status: 500,
      });
    });

    it('should create error response with custom status', () => {
      const response = createErrorResponse('Not found', undefined, 404);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Not found' },
        { status: 404 }
      );
      expect(response).toMatchObject({
        _data: { error: 'Not found' },
        _status: 404,
      });
    });

    it('should log error when error object is provided', () => {
      const error = new Error('Test error object');
      createErrorResponse('Error occurred', error);

      expect(console.error).toHaveBeenCalledWith('Error occurred', error);
    });

    it('should not log when no error object is provided', () => {
      createErrorResponse('Simple error');

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle error object with custom status', () => {
      const error = new Error('Unauthorized');
      const response = createErrorResponse('Auth failed', error, 401);

      expect(console.error).toHaveBeenCalledWith('Auth failed', error);
      expect(response).toMatchObject({
        _data: { error: 'Auth failed' },
        _status: 401,
      });
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with status 400', () => {
      const response = createValidationError('Invalid input');

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid input' },
        { status: 400 }
      );
      expect(response).toMatchObject({
        _data: { error: 'Invalid input' },
        _status: 400,
      });
    });

    it('should handle empty error message', () => {
      const response = createValidationError('');

      expect(response).toMatchObject({
        _data: { error: '' },
        _status: 400,
      });
    });

    it('should handle long error message', () => {
      const longMessage = 'a'.repeat(1000);
      const response = createValidationError(longMessage);

      expect(response).toMatchObject({
        _data: { error: longMessage },
        _status: 400,
      });
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const data = { message: 'Success', count: 42 };
      const response = createSuccessResponse(data);

      expect(NextResponse.json).toHaveBeenCalledWith(data);
      expect(response).toMatchObject({
        _data: data,
        _status: 200,
      });
    });

    it('should handle array data', () => {
      const data = [1, 2, 3, 4, 5];
      const response = createSuccessResponse(data);

      expect(response).toMatchObject({
        _data: data,
        _status: 200,
      });
    });

    it('should handle null data', () => {
      const response = createSuccessResponse(null);

      expect(response).toMatchObject({
        _data: null,
        _status: 200,
      });
    });

    it('should handle complex nested data', () => {
      const data = {
        user: {
          name: 'John',
          settings: {
            theme: 'dark',
            notifications: true,
          },
        },
        items: [1, 2, 3],
      };
      const response = createSuccessResponse(data);

      expect(response).toMatchObject({
        _data: data,
        _status: 200,
      });
    });
  });

  describe('handleValidation', () => {
    it('should return null for valid validation', () => {
      const validation = { valid: true };
      const result = handleValidation(validation);

      expect(result).toBeNull();
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    it('should return error response for invalid validation', () => {
      const validation = { valid: false, error: 'Invalid data' };
      const result = handleValidation(validation);

      expect(result).not.toBeNull();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid data' },
        { status: 400 }
      );
    });

    it('should use default error message when not provided', () => {
      const validation = { valid: false };
      const result = handleValidation(validation);

      expect(result).not.toBeNull();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Validation failed' },
        { status: 400 }
      );
    });

    it('should handle empty error string', () => {
      const validation = { valid: false, error: '' };
      const result = handleValidation(validation);

      expect(result).not.toBeNull();
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Validation failed' },
        { status: 400 }
      );
    });
  });

  describe('getRequiredParam', () => {
    it('should return param value when present', () => {
      const searchParams = new URLSearchParams({ key: 'value' });
      const result = getRequiredParam(searchParams, 'key');

      expect(result).toBe('value');
      expect(NextResponse.json).not.toHaveBeenCalled();
    });

    it('should return error response when param is missing', () => {
      const searchParams = new URLSearchParams();
      const result = getRequiredParam(searchParams, 'key');

      expect(isErrorResponse(result)).toBe(true);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Missing key parameter' },
        { status: 400 }
      );
    });

    it('should handle empty string param value', () => {
      const searchParams = new URLSearchParams({ key: '' });
      const result = getRequiredParam(searchParams, 'key');

      // Empty string is still a value, not missing
      expect(result).toBe('');
    });

    it('should handle multiple params', () => {
      const searchParams = new URLSearchParams({
        param1: 'value1',
        param2: 'value2',
      });

      const result1 = getRequiredParam(searchParams, 'param1');
      const result2 = getRequiredParam(searchParams, 'param2');

      expect(result1).toBe('value1');
      expect(result2).toBe('value2');
    });

    it('should handle special characters in param name', () => {
      const searchParams = new URLSearchParams({ 'special-param_name': 'value' });
      const result = getRequiredParam(searchParams, 'special-param_name');

      expect(result).toBe('value');
    });

    it('should handle URL encoded values', () => {
      const searchParams = new URLSearchParams({ url: 'https://example.com/path?query=1' });
      const result = getRequiredParam(searchParams, 'url');

      expect(result).toBe('https://example.com/path?query=1');
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for NextResponse instance', () => {
      const response = createErrorResponse('Error');
      expect(isErrorResponse(response)).toBe(true);
    });

    it('should return false for string', () => {
      expect(isErrorResponse('not a response')).toBe(false);
    });

    it('should return false for number', () => {
      expect(isErrorResponse(123)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isErrorResponse(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isErrorResponse(undefined)).toBe(false);
    });

    it('should return false for plain object', () => {
      expect(isErrorResponse({ error: 'test' })).toBe(false);
    });

    it('should return false for array', () => {
      expect(isErrorResponse([1, 2, 3])).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete validation flow', () => {
      // Scenario: API route validates and returns error
      const validation = { valid: false, error: 'Invalid input' };
      const errorResponse = handleValidation(validation);

      expect(errorResponse).not.toBeNull();
      expect(isErrorResponse(errorResponse!)).toBe(true);
    });

    it('should handle complete success flow', () => {
      // Scenario: API route validates and returns success
      const validation = { valid: true };
      const errorResponse = handleValidation(validation);

      expect(errorResponse).toBeNull();

      const successData = { result: 'ok' };
      const successResponse = createSuccessResponse(successData);
      expect(isErrorResponse(successResponse)).toBe(true); // It's still a NextResponse
    });

    it('should handle param extraction and validation', () => {
      const searchParams = new URLSearchParams({ lat: '40.7128' });

      const latParam = getRequiredParam(searchParams, 'lat');
      expect(typeof latParam).toBe('string');

      const lonParam = getRequiredParam(searchParams, 'lon');
      expect(isErrorResponse(lonParam)).toBe(true);
    });
  });
});
