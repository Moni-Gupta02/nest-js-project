import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { MediaImageSchema } from './Schemas/media.schema';
import { S3Utils } from 'src/common/utils/s3.utils';
import { ImageProcessingUtils } from 'src/common/utils/image-processing.utils';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Media', schema: MediaImageSchema }]),
  ],
  controllers: [MediaController],
  providers: [MediaService, S3Utils, ImageProcessingUtils],
})
export class MediaModule {}
