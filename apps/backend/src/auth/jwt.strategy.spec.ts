import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const getMock = jest.fn((key: string) =>
    key === 'JWT_SECRET' ? 'test-secret' : undefined,
  ) as jest.Mock<string | undefined, [string]>;
  const configService = { get: getMock } as unknown as ConfigService;

  beforeEach(() => {
    getMock.mockClear();
    strategy = new JwtStrategy(configService);
  });

  it('reads the JWT secret from config', () => {
    expect(getMock).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('maps the payload to the current-user shape', () => {
    const payload = {
      sub: 'u1',
      email: 'owner@luxa.com',
      role: 'owner',
      businessName: 'LUXA',
      businessId: 'u1',
      permissions: ['view-products'],
    };

    expect(strategy.validate(payload)).toEqual({
      id: 'u1',
      email: 'owner@luxa.com',
      role: 'owner',
      businessName: 'LUXA',
      businessId: 'u1',
      permissions: ['view-products'],
    });
  });

  it('carries permissions through when present', () => {
    const payload = {
      sub: 'u1',
      email: 'owner@luxa.com',
      role: 'owner',
      businessName: 'LUXA',
      businessId: 'u1',
      permissions: ['record-sales', 'view-inventory'],
    };

    const result = strategy.validate(payload);
    expect(result.permissions).toEqual(['record-sales', 'view-inventory']);
  });

  it('maps staffRole through to the current-user shape', () => {
    const payload = {
      sub: 'u2',
      email: 'staff@luxa.com',
      role: 'apprentice',
      businessName: 'LUXA',
      businessId: 'u1',
      staffRole: 'manager',
    };

    expect(strategy.validate(payload)).toEqual({
      id: 'u2',
      email: 'staff@luxa.com',
      role: 'apprentice',
      businessName: 'LUXA',
      businessId: 'u1',
      staffRole: 'manager',
    });
  });
});
