import {
  assertHttpUrl,
  assertPublicHostname,
  isBlockedIp,
  UnsafeWebhookUrlError,
} from '../src/integration/utils/ssrf-guard';

describe('ssrf-guard', () => {
  describe('isBlockedIp', () => {
    it('blocks loopback, private, link-local and cloud-metadata IPv4 addresses', () => {
      expect(isBlockedIp('127.0.0.1')).toBe(true);
      expect(isBlockedIp('10.1.2.3')).toBe(true);
      expect(isBlockedIp('172.16.0.5')).toBe(true);
      expect(isBlockedIp('172.31.255.255')).toBe(true);
      expect(isBlockedIp('192.168.1.1')).toBe(true);
      expect(isBlockedIp('169.254.169.254')).toBe(true); // cloud metadata
      expect(isBlockedIp('169.254.1.1')).toBe(true); // link-local
      expect(isBlockedIp('100.64.0.1')).toBe(true); // CGNAT
      expect(isBlockedIp('0.0.0.0')).toBe(true);
      expect(isBlockedIp('224.0.0.1')).toBe(true); // multicast
      expect(isBlockedIp('255.255.255.255')).toBe(true);
    });

    it('blocks loopback, unique-local and link-local IPv6 addresses', () => {
      expect(isBlockedIp('::1')).toBe(true);
      expect(isBlockedIp('::')).toBe(true);
      expect(isBlockedIp('fe80::1')).toBe(true);
      expect(isBlockedIp('fc00::1')).toBe(true);
      expect(isBlockedIp('fd12:3456::1')).toBe(true);
      expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true); // IPv4-mapped loopback
    });

    it('allows ordinary public IPv4/IPv6 addresses', () => {
      expect(isBlockedIp('8.8.8.8')).toBe(false);
      expect(isBlockedIp('1.1.1.1')).toBe(false);
      expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
    });

    it('treats a non-IP string as blocked (defensive default)', () => {
      expect(isBlockedIp('not-an-ip')).toBe(true);
    });
  });

  describe('assertHttpUrl', () => {
    it('accepts http/https URLs', () => {
      expect(() => assertHttpUrl('https://example.com/hook')).not.toThrow();
      expect(() => assertHttpUrl('http://example.com/hook')).not.toThrow();
    });

    it('rejects non-http(s) protocols and malformed URLs', () => {
      expect(() => assertHttpUrl('ftp://example.com')).toThrow(
        UnsafeWebhookUrlError,
      );
      expect(() => assertHttpUrl('not a url')).toThrow(UnsafeWebhookUrlError);
    });
  });

  describe('assertPublicHostname', () => {
    it('rejects an IP-literal hostname that is private/loopback without any DNS lookup', async () => {
      await expect(assertPublicHostname('127.0.0.1')).rejects.toThrow(
        UnsafeWebhookUrlError,
      );
      await expect(assertPublicHostname('169.254.169.254')).rejects.toThrow(
        UnsafeWebhookUrlError,
      );
      await expect(assertPublicHostname('10.0.0.5')).rejects.toThrow(
        UnsafeWebhookUrlError,
      );
    });

    it('rejects "localhost" (resolves to a loopback address)', async () => {
      await expect(assertPublicHostname('localhost')).rejects.toThrow(
        UnsafeWebhookUrlError,
      );
    });
  });
});
