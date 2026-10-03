import { describe, it, expect } from 'vitest';
import { getClientIp } from './clientIp.js';

function makeRequest(forwardedFor) {
  return {
    headers: forwardedFor === undefined ? {} : { 'x-forwarded-for': forwardedFor },
    socket: { remoteAddress: '10.0.0.1' },
  };
}

describe('getClientIp', () => {
  it('ignores the forwarded header when no proxy is trusted', () => {
    expect(getClientIp(makeRequest('1.2.3.4'), 0)).toBe('10.0.0.1');
  });

  it('uses the last forwarded address when one proxy is trusted', () => {
    expect(getClientIp(makeRequest('9.9.9.9, 1.2.3.4'), 1)).toBe('1.2.3.4');
  });

  it('counts back further when more proxies are trusted', () => {
    expect(getClientIp(makeRequest('1.2.3.4, 5.6.7.8, 10.1.1.1'), 2)).toBe('5.6.7.8');
  });

  it('falls back to the connection address when there is no header', () => {
    expect(getClientIp(makeRequest(undefined), 1)).toBe('10.0.0.1');
  });
});
