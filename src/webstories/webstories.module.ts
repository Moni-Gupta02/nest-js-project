import { Module } from '@nestjs/common';
import { WebstoriesService } from './webstories.service';
import { WebstoriesController } from './webstories.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { WebStoriesCategorySchema } from './schemas/webstory-category.schema';
import { WebStoriesSchema } from './schemas/webstories.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'webStoriesCategories', schema: WebStoriesCategorySchema },
      { name: 'webstories', schema: WebStoriesSchema },
    ]),
  ],

  controllers: [WebstoriesController],
  providers: [WebstoriesService],
})
export class WebstoriesModule {}
