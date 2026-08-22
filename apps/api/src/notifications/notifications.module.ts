import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { UnifonicAdapter } from './adapters/unifonic.adapter';

@Module({
  providers: [NotificationsService, UnifonicAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}
