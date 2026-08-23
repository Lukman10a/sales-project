import { TeamActivityController } from './team-activity.controller';
import { TeamActivityService } from './team-activity.service';

describe('TeamActivityController', () => {
  it('delegates to service with business-scoped user', async () => {
    const service = {
      getActivity: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    };
    const controller = new TeamActivityController(
      service as unknown as TeamActivityService,
    );

    const user = { businessId: 'b1' } as never;
    const query = { page: 1, limit: 20 } as never;

    await controller.getActivity(user, query);

    expect(service.getActivity).toHaveBeenCalledWith(user, query);
  });
});
