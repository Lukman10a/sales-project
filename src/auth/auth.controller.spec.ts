import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshToken: jest.Mock;
    logout: jest.Mock;
  };

  const currentUser = {
    id: 'u1',
    email: 'owner@luxa.com',
    role: 'owner',
    businessName: 'LUXA',
    businessId: 'u1',
    permissions: ['view-products'],
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('delegates register to the service', async () => {
    const dto = {
      email: 'owner@luxa.com',
      password: 'Password1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      businessName: 'LUXA',
    };
    authService.register.mockResolvedValue({ message: 'ok' });

    await expect(controller.register(dto)).resolves.toEqual({ message: 'ok' });
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('delegates login to the service', async () => {
    const dto = { email: 'owner@luxa.com', password: 'Password1' };
    authService.login.mockResolvedValue({ access_token: 't' });

    await expect(controller.login(dto)).resolves.toEqual({
      access_token: 't',
    });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('delegates refresh to the service with the refresh token', async () => {
    authService.refreshToken.mockResolvedValue({ access_token: 't' });

    await expect(controller.refresh({ refreshToken: 'rt' })).resolves.toEqual({
      access_token: 't',
    });
    expect(authService.refreshToken).toHaveBeenCalledWith('rt');
  });

  it('delegates logout to the service', () => {
    authService.logout.mockReturnValue({ message: 'Logged out successfully' });

    expect(controller.logout()).toEqual({ message: 'Logged out successfully' });
    expect(authService.logout).toHaveBeenCalled();
  });

  it('returns the current user', () => {
    expect(controller.getCurrentUser(currentUser)).toEqual(currentUser);
  });
});
