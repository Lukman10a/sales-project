import { deviceLabel } from './device-label';

describe('deviceLabel', () => {
  it.each([
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
      'Chrome on Windows',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0',
      'Edge on Windows',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Safari on iOS',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
      'Chrome on Android',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:132.0) Gecko/20100101 Firefox/132.0',
      'Firefox on macOS',
    ],
    ['curl/8.4.0', 'Unknown device'],
    [undefined, 'Unknown device'],
  ])('%s → %s', (ua, label) => {
    expect(deviceLabel(ua)).toBe(label);
  });
});
