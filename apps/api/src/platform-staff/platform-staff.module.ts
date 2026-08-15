import { Module } from '@nestjs/common';
import { PlatformStaffService } from './platform-staff.service';

@Module({
  providers: [PlatformStaffService],
  exports: [PlatformStaffService],
})
export class PlatformStaffModule {}
