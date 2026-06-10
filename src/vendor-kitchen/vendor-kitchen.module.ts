import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { VendorKitchenController } from './vendor-kitchen.controller';
import { VendorKitchenService } from './vendor-kitchen.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: 'Dump_Recipes', schema: DumpRecipesSchema }]),
  ],
  controllers: [VendorKitchenController],
  providers: [VendorKitchenService],
  exports: [VendorKitchenService],
})
export class VendorKitchenModule {}
