import { RedisConnection } from './redis';

describe('RedisConnection', () => {
  it('has no client without REDIS_URL', async () => {
    const c = RedisConnection.fromUrl(undefined);
    expect(c.client).toBeNull();
    await expect(c.onApplicationShutdown()).resolves.toBeUndefined();
  });

  it('quits its client on shutdown', async () => {
    const quit = jest.fn().mockResolvedValue('OK');
    const client = { on: jest.fn(), quit, status: 'ready' };
    const c = new RedisConnection(
      client as unknown as ConstructorParameters<typeof RedisConnection>[0],
    );
    await c.onApplicationShutdown();
    expect(quit).toHaveBeenCalled();
    expect(client.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
