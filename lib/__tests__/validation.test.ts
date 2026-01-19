import { validateCoordinates } from '../validation';

describe('validateCoordinates', () => {
  describe('Valid Coordinates', () => {
    it('should accept valid coordinates', () => {
      const result = validateCoordinates('40.7128', '-74.0060');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(40.7128);
      expect(result.lon).toBe(-74.0060);
      expect(result.error).toBeUndefined();
    });

    it('should accept minimum latitude', () => {
      const result = validateCoordinates('-90', '0');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(-90);
      expect(result.lon).toBe(0);
    });

    it('should accept maximum latitude', () => {
      const result = validateCoordinates('90', '0');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(90);
      expect(result.lon).toBe(0);
    });

    it('should accept minimum longitude', () => {
      const result = validateCoordinates('0', '-180');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(0);
      expect(result.lon).toBe(-180);
    });

    it('should accept maximum longitude', () => {
      const result = validateCoordinates('0', '180');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(0);
      expect(result.lon).toBe(180);
    });

    it('should accept coordinates at equator and prime meridian', () => {
      const result = validateCoordinates('0', '0');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(0);
      expect(result.lon).toBe(0);
    });

    it('should accept decimal coordinates', () => {
      const result = validateCoordinates('37.7749', '-122.4194');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(37.7749);
      expect(result.lon).toBe(-122.4194);
    });

    it('should accept high precision coordinates', () => {
      const result = validateCoordinates('35.6762', '139.6503');
      expect(result.valid).toBe(true);
      expect(result.lat).toBeCloseTo(35.6762, 4);
      expect(result.lon).toBeCloseTo(139.6503, 4);
    });
  });

  describe('Missing Parameters', () => {
    it('should reject when lat is null', () => {
      const result = validateCoordinates(null, '-74.0060');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing lat or lon parameter');
      expect(result.lat).toBeUndefined();
      expect(result.lon).toBeUndefined();
    });

    it('should reject when lon is null', () => {
      const result = validateCoordinates('40.7128', null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing lat or lon parameter');
    });

    it('should reject when both are null', () => {
      const result = validateCoordinates(null, null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing lat or lon parameter');
    });
  });

  describe('Invalid Number Format', () => {
    it('should reject non-numeric latitude', () => {
      const result = validateCoordinates('not-a-number', '-74.0060');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid latitude or longitude values');
    });

    it('should reject non-numeric longitude', () => {
      const result = validateCoordinates('40.7128', 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid latitude or longitude values');
    });

    it('should reject empty string for latitude', () => {
      const result = validateCoordinates('', '-74.0060');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing lat or lon parameter');
    });

    it('should reject empty string for longitude', () => {
      const result = validateCoordinates('40.7128', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing lat or lon parameter');
    });
  });

  describe('Latitude Range Validation', () => {
    it('should reject latitude > 90', () => {
      const result = validateCoordinates('90.1', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject latitude < -90', () => {
      const result = validateCoordinates('-90.1', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject latitude way out of range', () => {
      const result = validateCoordinates('200', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject negative latitude out of range', () => {
      const result = validateCoordinates('-100', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });
  });

  describe('Longitude Range Validation', () => {
    it('should reject longitude > 180', () => {
      const result = validateCoordinates('0', '180.1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should reject longitude < -180', () => {
      const result = validateCoordinates('0', '-180.1');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should reject longitude way out of range', () => {
      const result = validateCoordinates('0', '360');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should reject negative longitude out of range', () => {
      const result = validateCoordinates('0', '-200');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });
  });

  describe('Edge Cases', () => {
    it('should handle latitude with leading/trailing spaces', () => {
      const result = validateCoordinates(' 40.7128 ', '-74.0060');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(40.7128);
    });

    it('should handle longitude with leading/trailing spaces', () => {
      const result = validateCoordinates('40.7128', ' -74.0060 ');
      expect(result.valid).toBe(true);
      expect(result.lon).toBe(-74.0060);
    });

    it('should handle scientific notation', () => {
      const result = validateCoordinates('4.07128e1', '-7.40060e1');
      expect(result.valid).toBe(true);
      expect(result.lat).toBeCloseTo(40.7128, 4);
      expect(result.lon).toBeCloseTo(-74.0060, 4);
    });

    it('should reject infinity', () => {
      const result = validateCoordinates('Infinity', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject NaN string', () => {
      const result = validateCoordinates('NaN', '0');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid latitude or longitude values');
    });
  });

  describe('Real-World Locations', () => {
    it('should accept New York coordinates', () => {
      const result = validateCoordinates('40.7128', '-74.0060');
      expect(result.valid).toBe(true);
    });

    it('should accept Seoul coordinates', () => {
      const result = validateCoordinates('37.5665', '126.9780');
      expect(result.valid).toBe(true);
    });

    it('should accept Tokyo coordinates', () => {
      const result = validateCoordinates('35.6762', '139.6503');
      expect(result.valid).toBe(true);
    });

    it('should accept London coordinates', () => {
      const result = validateCoordinates('51.5074', '-0.1278');
      expect(result.valid).toBe(true);
    });

    it('should accept Sydney coordinates', () => {
      const result = validateCoordinates('-33.8688', '151.2093');
      expect(result.valid).toBe(true);
    });
  });
});
