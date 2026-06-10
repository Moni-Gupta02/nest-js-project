import { Module } from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { BlogsController } from './blogs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogSchema } from './schemas/blog.schema';
import { BlogCategorySchema } from './schemas/blogCategory.schema';
import { BlogTagSchema } from './schemas/blogTag.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'blogs', schema: BlogSchema },
      { name: 'blogcategories', schema: BlogCategorySchema },
      { name: 'blogtags', schema: BlogTagSchema },
    ]),
  ],

  controllers: [BlogsController],
  providers: [BlogsService],
})
export class BlogsModule {}
