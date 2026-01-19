import { validateCalendarUrl } from '../urlValidation';

describe('validateCalendarUrl', () => {
  describe('Valid URLs', () => {
    it('should accept valid HTTP URL', () => {
      const result = validateCalendarUrl('http://example.com/calendar.ics');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid HTTPS URL', () => {
      const result = validateCalendarUrl('https://example.com/calendar.ics');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept URL with port 80', () => {
      const result = validateCalendarUrl('http://example.com:80/calendar.ics');
      expect(result.valid).toBe(true);
    });

    it('should accept URL with port 443', () => {
      const result = validateCalendarUrl('https://example.com:443/calendar.ics');
      expect(result.valid).toBe(true);
    });

    it('should reject URL with port 8080 (common HTTP alt port)', () => {
      const result = validateCalendarUrl('http://example.com:8080/calendar.ics');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port is not allowed');
    });

    it('should accept URL with query parameters', () => {
      const result = validateCalendarUrl('https://example.com/calendar?key=value');
      expect(result.valid).toBe(true);
    });
  });

  describe('Invalid Protocol', () => {
    it('should reject FTP protocol', () => {
      const result = validateCalendarUrl('ftp://example.com/file.txt');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only HTTP and HTTPS protocols are allowed');
    });

    it('should reject file protocol', () => {
      const result = validateCalendarUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only HTTP and HTTPS protocols are allowed');
    });

    it('should reject javascript protocol', () => {
      const result = validateCalendarUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only HTTP and HTTPS protocols are allowed');
    });

    it('should reject data protocol', () => {
      const result = validateCalendarUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Only HTTP and HTTPS protocols are allowed');
    });
  });

  describe('Localhost Protection', () => {
    it('should reject localhost', () => {
      const result = validateCalendarUrl('http://localhost/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Localhost URLs are not allowed');
    });

    it('should reject 127.0.0.1', () => {
      const result = validateCalendarUrl('http://127.0.0.1/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Localhost URLs are not allowed');
    });

    it('should reject 0.0.0.0', () => {
      const result = validateCalendarUrl('http://0.0.0.0/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Localhost URLs are not allowed');
    });

    it('should reject IPv6 localhost ::1', () => {
      const result = validateCalendarUrl('http://[::1]/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Localhost URLs are not allowed');
    });

    it('should reject IPv6 localhost ::ffff:127.0.0.1', () => {
      const result = validateCalendarUrl('http://[::ffff:127.0.0.1]/api');
      expect(result.valid).toBe(false);
      // This is caught by the IPv4-mapped IPv6 check in isAllowedIP
      expect(result.error).toBe('IP address is in a restricted range');
    });
  });

  describe('Private IP Protection', () => {
    it('should reject 10.0.0.0/8 range', () => {
      const result = validateCalendarUrl('http://10.0.0.1/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should reject 172.16.0.0/12 range', () => {
      const result = validateCalendarUrl('http://172.16.0.1/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should reject 192.168.0.0/16 range', () => {
      const result = validateCalendarUrl('http://192.168.1.1/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should reject link-local 169.254.0.0/16', () => {
      const result = validateCalendarUrl('http://169.254.1.1/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });
  });

  describe('Cloud Metadata Service Protection', () => {
    it('should reject AWS/Azure/GCP IPv4 metadata service', () => {
      const result = validateCalendarUrl('http://169.254.169.254/latest/meta-data');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Metadata service URLs are not allowed');
    });

    it('should reject AWS IPv6 metadata service', () => {
      const result = validateCalendarUrl('http://[fd00:ec2::254]/latest/meta-data');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Metadata service URLs are not allowed');
    });
  });

  describe('Port Restrictions', () => {
    it('should reject SSH port 22', () => {
      const result = validateCalendarUrl('http://example.com:22/');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port in privileged range (1-1023) is not allowed except 80 and 443');
    });

    it('should reject MySQL port 3306', () => {
      const result = validateCalendarUrl('http://example.com:3306/');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port is not allowed');
    });

    it('should reject Redis port 6379', () => {
      const result = validateCalendarUrl('http://example.com:6379/');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port is not allowed');
    });

    it('should reject privileged port 1 (not 80/443)', () => {
      const result = validateCalendarUrl('http://example.com:1/');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port in privileged range (1-1023) is not allowed except 80 and 443');
    });

    it('should reject privileged port 1023', () => {
      const result = validateCalendarUrl('http://example.com:1023/');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Port in privileged range (1-1023) is not allowed except 80 and 443');
    });
  });

  describe('IPv6 Private Range Protection', () => {
    it('should reject IPv6 link-local fe80::', () => {
      const result = validateCalendarUrl('http://[fe80::1]/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should reject IPv6 unique local fc00::', () => {
      const result = validateCalendarUrl('http://[fc00::1]/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should reject IPv6 unique local fd00::', () => {
      const result = validateCalendarUrl('http://[fd00::1]/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });
  });

  describe('Invalid URL Format', () => {
    it('should reject malformed URL', () => {
      const result = validateCalendarUrl('not a url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('should reject empty string', () => {
      const result = validateCalendarUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('should reject URL without protocol', () => {
      const result = validateCalendarUrl('example.com/calendar.ics');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });

  describe('Edge Cases', () => {
    it('should reject multicast address 224.0.0.1', () => {
      const result = validateCalendarUrl('http://224.0.0.1/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should reject broadcast address 255.255.255.255', () => {
      const result = validateCalendarUrl('http://255.255.255.255/api');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('IP address is in a restricted range');
    });

    it('should accept public IP address', () => {
      const result = validateCalendarUrl('http://8.8.8.8/api');
      expect(result.valid).toBe(true);
    });

    it('should accept valid domain name', () => {
      const result = validateCalendarUrl('https://calendar.google.com/calendar/ical/example/public/basic.ics');
      expect(result.valid).toBe(true);
    });
  });
});
