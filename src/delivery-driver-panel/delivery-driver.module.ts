import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DeliveryDriverController } from './delivery-driver.controller';
import { DeliveryDriverService } from './delivery-driver.service';

import { User, UserSchema } from './schema/users.schema';
import { DriverStepperSchema } from '../driver/schemas/driver-stepper.schema';
import { AWBSchema } from '../pickup-orders/schemas/awb.schema';
import {
    DriverBagManagement,
    DriverBagManagementSchema,
} from './schema/driver-bag-management.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: User.name,
                schema: UserSchema,
            },
            { name: 'driver_stepper', schema: DriverStepperSchema },
            { name: 'awbs', schema: AWBSchema },
            {
                name: 'driver_bag_management',
                schema: DriverBagManagementSchema,
            },
        ]),
    ],
    controllers: [DeliveryDriverController],
    providers: [DeliveryDriverService],
    exports: [DeliveryDriverService],
})
export class DeliveryDriverModule { }