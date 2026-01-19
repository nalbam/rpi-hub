import { URL } from 'url';
import { isIP } from 'net';
import * as https from 'https';
import * as http from 'http';
import { API } from './constants';

/**
 * Validates a URL to prevent SSRF attacks
 * Checks protocol, hostname, IP ranges, and ports
 */
export function validateCalendarUrl(urlString: string): { valid: boolean; error?: string } {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow http and https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = url.hostname.toLowerCase();
  // Strip brackets from IPv6 addresses for IP validation
  const hostnameForIPCheck = hostname.replace(/^\[|\]$/g, '');

  // Block localhost and common loopback names
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
  ];

  if (localhostPatterns.some(pattern => hostname === pattern)) {
    return { valid: false, error: 'Localhost URLs are not allowed' };
  }

  // Block metadata service IPs (cloud providers)
  const metadataIPs = [
    '169.254.169.254', // AWS, Azure, GCP metadata
    '[fd00:ec2::254]', // AWS IPv6 metadata (with brackets as returned by URL.hostname)
  ];

  if (metadataIPs.includes(hostname)) {
    return { valid: false, error: 'Metadata service URLs are not allowed' };
  }

  // Check if hostname is an IP address
  const ipVersion = isIP(hostnameForIPCheck);
  if (ipVersion) {
    if (!isAllowedIP(hostnameForIPCheck, ipVersion)) {
      return { valid: false, error: 'IP address is in a restricted range' };
    }
  }

  // Block privileged and commonly dangerous ports
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
  const blockedPorts = [
    // Privileged ports (except 80, 443)
    22,   // SSH
    23,   // Telnet
    25,   // SMTP
    3306, // MySQL
    5432, // PostgreSQL
    6379, // Redis
    27017, // MongoDB
    // Other dangerous ports
    21,   // FTP
    110,  // POP3
    143,  // IMAP
    3389, // RDP
    5900, // VNC
    8080, // Common HTTP alt
    // Allow 80 and 443 (standard HTTP/HTTPS)
  ];

  if (port < 1024 && port !== 80 && port !== 443) {
    return { valid: false, error: 'Port in privileged range (1-1023) is not allowed except 80 and 443' };
  }

  if (blockedPorts.includes(port)) {
    return { valid: false, error: 'Port is not allowed' };
  }

  return { valid: true };
}

/**
 * Checks if an IP address is in an allowed range
 * Blocks private, loopback, link-local, and reserved ranges
 */
function isAllowedIP(ip: string, version: number): boolean {
  if (version === 4) {
    const parts = ip.split('.').map(Number);

    // Loopback (127.0.0.0/8)
    if (parts[0] === 127) return false;

    // Private ranges
    // 10.0.0.0/8
    if (parts[0] === 10) return false;

    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return false;

    // Link-local (169.254.0.0/16)
    if (parts[0] === 169 && parts[1] === 254) return false;

    // Multicast (224.0.0.0/4)
    if (parts[0] >= 224 && parts[0] <= 239) return false;

    // Reserved (240.0.0.0/4)
    if (parts[0] >= 240) return false;

    // 0.0.0.0/8
    if (parts[0] === 0) return false;

    return true;
  } else if (version === 6) {
    const lower = ip.toLowerCase();

    // Loopback (::1)
    if (lower === '::1') return false;

    // Link-local (fe80::/10)
    if (lower.startsWith('fe80:')) return false;

    // Unique local (fc00::/7)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return false;

    // IPv4-mapped IPv6 (::ffff:0:0/96)
    if (lower.includes('::ffff:')) return false;

    return true;
  }

  return false;
}

/**
 * Fetches a URL with timeout protection
 * Uses https module with IPv4 preference to avoid IPv6 timeout issues in WSL
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = API.TIMEOUT_MS,
  maxSize: number = API.MAX_RESPONSE_SIZE,
  redirectCount: number = 0
): Promise<Response> {
  return new Promise((resolve, reject) => {
    // Prevent infinite redirect loops
    if (redirectCount > API.MAX_REDIRECTS) {
      reject(new Error('Too many redirects'));
      return;
    }

    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      family: 4, // Force IPv4 to avoid IPv6 timeout issues in WSL
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'rpi-hub/1.0',
      },
    };

    const req = client.request(options, (res: http.IncomingMessage) => {
      // Check response size
      const contentLength = res.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > maxSize) {
        req.destroy();
        reject(new Error('Response size exceeds maximum allowed'));
        return;
      }

      // Handle redirects manually (follow up to 5 redirects)
      const statusCode = res.statusCode || 0;
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        fetchWithTimeout(redirectUrl, timeoutMs, maxSize, redirectCount + 1).then(resolve).catch(reject);
        return;
      }

      // Collect response data
      const chunks: Buffer[] = [];
      let totalSize = 0;

      res.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > maxSize) {
          req.destroy();
          reject(new Error('Response size exceeds maximum allowed'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf-8');

        // Create a Response-like object
        const response = {
          ok: statusCode >= 200 && statusCode < 300,
          status: statusCode,
          statusText: res.statusMessage,
          headers: {
            get: (name: string) => res.headers[name.toLowerCase()] || null,
          },
          text: async () => text,
          json: async () => {
            try {
              return JSON.parse(text);
            } catch {
              throw new Error('Invalid JSON response');
            }
          },
        } as Response;

        resolve(response);
      });
    });

    req.on('error', (err: Error) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}
