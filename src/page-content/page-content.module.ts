import { Module } from '@nestjs/common';
import { PageContentService } from './page-content.service';
import { PageContentController } from './page-content.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { WhoWeServeSchema } from './schemas/who-we-serve.schema';
import { DeliveryLocationSchema } from './schemas/delivery-locaion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'delivery_locations', schema: DeliveryLocationSchema },
      { name: 'who_we_serves', schema: WhoWeServeSchema },
    ]),
  ],
  controllers: [PageContentController],
  providers: [PageContentService],
})
export class PageContentModule {}
