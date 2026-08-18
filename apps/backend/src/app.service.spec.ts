import { AppService } from './app.service';

describe('AppService', () => {
  const service = new AppService();

  it('returns "Hello World!"', () => {
    expect(service.getHello()).toBe('Hello World!');
  });
});
