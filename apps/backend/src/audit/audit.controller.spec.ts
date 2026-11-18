import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { AuditController } from './audit.controller';
import type { AuditService } from './audit.service';

describe('AuditController', () => {
  const list = jest.fn().mockResolvedValue({ data: [], nextCursor: null });
  const controller = new AuditController({ list } as unknown as AuditService);

  it('lists the trail of the caller’s business', async () => {
    await expect(controller.list('b1', { limit: 50 })).resolves.toEqual({
      data: [],
      nextCursor: null,
    });
    expect(list).toHaveBeenCalledWith('b1', { limit: 50 });
  });

  it('requires staff.manage', () => {
    const required: unknown = Reflect.getMetadata(
      PERMISSIONS_KEY,
      Object.getOwnPropertyDescriptor(AuditController.prototype, 'list')
        ?.value as object,
    );
    expect(required).toEqual(['staff.manage']);
  });
});
