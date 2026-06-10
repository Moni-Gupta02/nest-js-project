import { Module } from '@nestjs/common';
import { SitemapService } from './sitemap.service';
import { SitemapController } from './sitemap.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteMapSchema } from './schemas/sitemap.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'sitemap_urls', schema: SiteMapSchema },
    ]),
  ],
  controllers: [SitemapController],
  providers: [SitemapService],
})
export class SitemapModule {}
