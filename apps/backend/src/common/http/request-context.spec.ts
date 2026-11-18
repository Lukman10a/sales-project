import type { Request, Response } from 'express';
import { requestContext, requestContextMiddleware } from './request-context';

describe('request context', () => {
  it('is empty outside a request', () => {
    expect(requestContext()).toEqual({});
  });

  it('carries the client ip and user agent through the request', () => {
    const req = {
      ip: '1.2.3.4',
      headers: { 'user-agent': 'UA' },
    } as unknown as Request;
    let seen = {};
    requestContextMiddleware(req, {} as Response, () => {
      seen = requestContext();
    });
    expect(seen).toEqual({ ip: '1.2.3.4', userAgent: 'UA' });
  });
});
