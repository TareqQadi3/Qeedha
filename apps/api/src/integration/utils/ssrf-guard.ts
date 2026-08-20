import { lookup as dnsLookup } from 'dns';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { isIP, isIPv4 } from 'net';

/**
 * Blocks webhook URLs from reaching loopback, private, link-local, and other
 * non-public network ranges — including the cloud-metadata address
 * 169.254.169.254 — so a merchant cannot use webhook registration/dispatch as
 * an SSRF primitive against internal infrastructure.
 */
export class UnsafeWebhookUrlError extends Error {}

function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 IETF protocol assignments
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast

  return false;
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true; // loopback / unspecified
  if (
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true; // fe80::/10 link-local
  }
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true; // fc00::/7 unique local

  // IPv4-mapped/compatible addresses (::ffff:a.b.c.d or ::a.b.c.d) — validate the embedded IPv4.
  const mapped = normalized.match(/(?:^::ffff:|^::)(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIpv4(mapped[1]);

  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not a valid IP literal at all — treat as unsafe
}

function resolveHostname(hostname: string): Promise<string> {
  if (isIP(hostname)) return Promise.resolve(hostname);
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: false }, (err, address) => {
      if (err) reject(err);
      else resolve(address);
    });
  });
}

/**
 * Resolves `hostname` and throws `UnsafeWebhookUrlError` if it is (or
 * resolves to) a blocked address. Called both at registration time and again
 * immediately before every dispatch, so a DNS answer that changes between the
 * two (DNS rebinding) is still caught right before the connection is made.
 */
export async function assertPublicHostname(hostname: string): Promise<string> {
  let ip: string;
  try {
    ip = await resolveHostname(hostname);
  } catch {
    throw new UnsafeWebhookUrlError(
      `Could not resolve webhook host: ${hostname}`,
    );
  }
  if (isBlockedIp(ip)) {
    throw new UnsafeWebhookUrlError(
      `Webhook host resolves to a blocked address: ${hostname} -> ${ip}`,
    );
  }
  return ip;
}

export function assertHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeWebhookUrlError('Invalid webhook URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeWebhookUrlError('Webhook URL must use http or https');
  }
  return url;
}

/**
 * POSTs `body` to `rawUrl` after re-resolving and re-validating the host,
 * then pins the TCP connection to that validated IP via the `lookup` option
 * — so nothing between validation and connection (a second, different DNS
 * answer) can redirect the request. Uses Node's core http/https client
 * (never `fetch`) so redirects are never followed automatically; a 3xx
 * response is just reported as a non-2xx status, exactly like any other
 * failure.
 */
export function safeWebhookPost(
  rawUrl: string,
  body: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<{ status: number }> {
  const url = assertHttpUrl(rawUrl);
  const isHttps = url.protocol === 'https:';

  return assertPublicHostname(url.hostname).then(
    (ip) =>
      new Promise<{ status: number }>((resolve, reject) => {
        const requester = isHttps ? httpsRequest : httpRequest;
        const req = requester(
          {
            hostname: url.hostname,
            lookup: (_host, _opts, cb) => cb(null, ip, isIPv4(ip) ? 4 : 6),
            port: url.port ? Number(url.port) : isHttps ? 443 : 80,
            path: `${url.pathname}${url.search}`,
            method: 'POST',
            headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
            timeout: timeoutMs,
          },
          (res) => {
            res.resume(); // drain the response body, we only need the status
            resolve({ status: res.statusCode ?? 0 });
          },
        );
        req.on('timeout', () =>
          req.destroy(new Error('Webhook request timed out')),
        );
        req.on('error', reject);
        req.write(body);
        req.end();
      }),
  );
}
