import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './Schemas/auth.schema';
import { JwtStrategy } from '../common/jwt/jwt.strategy';
import { AdminHistorySchema } from 'src/admin-history/Schema/adminHistory';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'userKMS', schema: UserSchema },
      { name: 'admin_history', schema: AdminHistorySchema },
      { name: 'Customers', schema: CustomerSchema },
    ]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.TOKEN_EXPIRY || '365h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminHistoryService],
  exports: [AuthService],
})
export class AuthModule {}
