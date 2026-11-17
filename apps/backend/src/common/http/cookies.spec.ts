import { parseCookies } from './cookies';

describe('parseCookies', () => {
  it('returns an empty object without a header', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('')).toEqual({});
  });

  it('parses and decodes name=value pairs', () => {
    expect(parseCookies('a=1; __Host-luxa_at=x.y.z; b=hello%20world')).toEqual({
      a: '1',
      '__Host-luxa_at': 'x.y.z',
      b: 'hello world',
    });
  });

  it('keeps the first value of a duplicated name', () => {
    expect(parseCookies('a=first; a=second')).toEqual({ a: 'first' });
  });

  it('skips malformed pairs and keeps undecodable values raw', () => {
    expect(parseCookies('novalue; =x; c=%E0%A4%A')).toEqual({ c: '%E0%A4%A' });
  });
});
