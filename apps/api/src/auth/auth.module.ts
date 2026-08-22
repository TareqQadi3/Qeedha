import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { PinService } from './services/pin.service';
import { NafathService } from './services/nafath.service';
import { QrService } from './services/qr.service';
import { JwtStrategy } from './guards/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { AdminGuard } from './guards/admin.guard';
import { PlatformStaffModule } from '../platform-staff/platform-staff.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    PlatformStaffModule,
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    PinService,
    NafathService,
    QrService,
    JwtStrategy,
    RolesGuard,
    AdminGuard,
  ],
  exports: [
    AuthService,
    OtpService,
    TokenService,
    PinService,
    NafathService,
    QrService,
    RolesGuard,
    AdminGuard,
  ],
})
export class AuthModule {}
