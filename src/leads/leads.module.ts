import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsSchema } from './schemas/lead.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { ClevertapService } from 'src/common/utils/clevertapService';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Leads', schema: LeadsSchema },
      { name: 'Customers', schema: CustomerSchema },
    ]),
  ],
  controllers: [LeadsController],
  providers: [LeadsService, ClevertapService],
})
export class LeadsModule {}
