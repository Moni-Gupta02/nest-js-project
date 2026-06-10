import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslationController } from './translation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TranslateSchema } from './schemas/translation.schema';
import { MetaScriptSchema } from './schemas/meta-script.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'translations', schema: TranslateSchema },
      { name: 'meta_scripts', schema: MetaScriptSchema },
    ]),
  ],
  controllers: [TranslationController],
  providers: [TranslationService],
})
export class TranslationModule {}
