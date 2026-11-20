import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  const service = {
    status: jest.fn().mockResolvedValue({ twoFactorEnabled: false }),
    beginSetup: jest.fn().mockResolvedValue({ secret: 'S', otpauthUri: 'u' }),
    enable: jest.fn().mockResolvedValue({ backupCodes: ['a'] }),
    disable: jest.fn().mockResolvedValue({ message: 'off' }),
    regenerateBackupCodes: jest.fn().mockResolvedValue({ backupCodes: ['b'] }),
    setRequirement: jest.fn().mockResolvedValue({ required: false }),
  };
  const user = {
    id: 'u1',
    email: 'ada@shop.ng',
    role: 'owner' as const,
    permissions: [],
    maxDiscountPercent: 100,
    businessName: 'Shop',
    businessId: 'u1',
  };
  const req = { headers: { 'user-agent': 'UA' }, ip: '1.2.3.4' } as Request;
  const ctx = { userAgent: 'UA', ip: '1.2.3.4' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [{ provide: TwoFactorService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = moduleRef.get(TwoFactorController);
  });

  it('reports status for the signed-in user', async () => {
    await controller.status(user);
    expect(service.status).toHaveBeenCalledWith('u1');
  });

  it('starts setup', async () => {
    await expect(controller.setup(user)).resolves.toEqual({
      secret: 'S',
      otpauthUri: 'u',
    });
    expect(service.beginSetup).toHaveBeenCalledWith('u1');
  });

  it('enables with the confirming code', async () => {
    await controller.enable(user, { code: '123456' }, req);
    expect(service.enable).toHaveBeenCalledWith('u1', '123456', ctx);
  });

  it('disables with password and code', async () => {
    await controller.disable(user, { password: 'pw', code: '123456' }, req);
    expect(service.disable).toHaveBeenCalledWith('u1', 'pw', '123456', ctx);
  });

  it('regenerates backup codes', async () => {
    await controller.regenerateBackupCodes(user, { code: '123456' }, req);
    expect(service.regenerateBackupCodes).toHaveBeenCalledWith(
      'u1',
      '123456',
      ctx,
    );
  });

  it('changes the business requirement as the current user', async () => {
    await controller.setRequirement(user, { required: false }, req);
    expect(service.setRequirement).toHaveBeenCalledWith(user, false, ctx);
  });
});
