import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { CurrentUserPayload } from '../interfaces/current-user-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: CurrentUserPayload }>();
    return request.user;
  },
);
