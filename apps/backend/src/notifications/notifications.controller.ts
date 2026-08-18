import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser, ZodValidationPipe } from '../common';
import type { CurrentUserPayload } from '../common';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDtoSchema } from './dto/query-notifications.dto';
import type { QueryNotificationsDto } from './dto/query-notifications.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  /**
   * List the current user's notifications with type/read filters and unread count
   * GET /notifications?type=inventory&read=false&page=1&limit=20
   * Requires: authenticated
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query(new ZodValidationPipe(QueryNotificationsDtoSchema))
    query: QueryNotificationsDto,
  ) {
    return this.notificationsService.list(user, query);
  }

  /**
   * Mark a single notification as read
   * PATCH /notifications/:id/read
   * Requires: authenticated
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(user, id);
  }

  /**
   * Delete a notification
   * DELETE /notifications/:id
   * Requires: authenticated
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.remove(user, id);
  }

  /**
   * Mark all of the current user's notifications as read
   * POST /notifications/mark-all-read
   * Requires: authenticated
   */
  @Post('mark-all-read')
  @UseGuards(JwtAuthGuard)
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user);
  }
}
